import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";

/**
 * Get an agent by ID.
 */
export const getAgent = query({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.deletedAt) {
      return null;
    }
    return agent;
  },
});

/**
 * Trigger retraining for an agent.
 * This re-embeds sources whose contentHash has changed since last embedding.
 */
export const retrainAgent = mutation({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.deletedAt) {
      throw new Error("Agent not found");
    }

    // Find all ready sources for this agent where contentHash !== embeddedContentHash
    const sources = await ctx.db
      .query("sources")
      .withIndex("by_organizationId_agentId", (q) =>
        q
          .eq("organizationId", agent.organizationId)
          .eq("agentId", args.agentId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "ready"),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .collect();

    // Filter to sources that need re-embedding:
    // - contentHash exists and differs from embeddedContentHash, OR
    // - embeddedContentHash is undefined (never embedded with hash tracking)
    const sourcesToRetrain = sources.filter((source) => {
      if (!source.contentHash) {
        // No contentHash set - can't track changes, skip
        return false;
      }
      // Re-embed if embeddedContentHash doesn't match current contentHash
      return source.contentHash !== source.embeddedContentHash;
    });

    if (sourcesToRetrain.length === 0) {
      // No sources need retraining - just update the agent
      await ctx.db.patch(args.agentId, {
        needsRetraining: false,
        lastTrainedAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { retrainedCount: 0, sourceIds: [] };
    }

    const sourceIds = sourcesToRetrain.map((s) => s._id);

    // Schedule the retraining action
    await ctx.scheduler.runAfter(0, internal.agents.retrainAgentSources, {
      agentId: args.agentId,
      organizationId: agent.organizationId,
      sourceIds,
      embeddingModel: agent.embeddingModel,
    });

    return { retrainedCount: sourceIds.length, sourceIds };
  },
});

/**
 * Internal action to re-embed sources for an agent.
 */
export const retrainAgentSources = internalAction({
  args: {
    agentId: v.id("agents"),
    organizationId: v.id("organizations"),
    sourceIds: v.array(v.id("sources")),
    embeddingModel: v.string(),
  },
  handler: async (ctx, args) => {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Process each source
    for (const sourceId of args.sourceIds) {
      // Delete existing chunks for this source
      await ctx.runMutation(internal.agents.deleteChunksBySource, {
        sourceId,
      });

      // Get the source to get its content
      const source = await ctx.runQuery(internal.agents.getSourceInternal, {
        sourceId,
      });

      if (!source) {
        continue;
      }

      // Get content to embed based on source type
      let contentToEmbed: string | null = null;
      const sourceName = source.name;

      if (source.type === "qa" && source.question && source.answer) {
        contentToEmbed = `Question: ${source.question}\n\nAnswer: ${source.answer}`;
      } else if (source.type === "text" && source.content) {
        contentToEmbed = source.content;
      } else {
        // For file and website sources, we can't re-embed without the original content
        // These would need to be re-processed through the workflow
        // Skip for now - they already have chunks from initial processing
        continue;
      }

      if (!contentToEmbed) {
        continue;
      }

      // Chunk the content
      const chunks = chunkText(contentToEmbed);

      if (chunks.length === 0) {
        continue;
      }

      // Generate embeddings
      const texts = chunks.map((chunk) => chunk.content);
      const embeddingResponse = await openai.embeddings.create({
        model: args.embeddingModel,
        input: texts,
      });

      // Prepare chunks with embeddings
      const chunksWithEmbeddings = chunks.map((chunk, index) => ({
        organizationId: args.organizationId,
        agentId: args.agentId,
        sourceId,
        content: chunk.content,
        embedding: embeddingResponse.data[index].embedding,
        embeddingModel: args.embeddingModel,
        metadata: {
          sourceType: source.type,
          sourceName,
          chunkIndex: chunk.chunkIndex,
        },
      }));

      // Store new chunks
      await ctx.runMutation(internal.agents.insertChunksForRetrain, {
        chunks: chunksWithEmbeddings,
      });

      // Update source's embeddedContentHash
      await ctx.runMutation(internal.agents.updateSourceEmbeddedHash, {
        sourceId,
        embeddedContentHash: source.contentHash ?? undefined,
        chunkCount: chunks.length,
      });
    }

    // Complete retraining
    await ctx.runMutation(internal.agents.completeRetraining, {
      agentId: args.agentId,
    });
  },
});

/**
 * Internal query to get a source by ID.
 */
export const getSourceInternal = internalQuery({
  args: {
    sourceId: v.id("sources"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sourceId);
  },
});

/**
 * Internal mutation to delete all chunks for a source.
 */
export const deleteChunksBySource = internalMutation({
  args: {
    sourceId: v.id("sources"),
  },
  handler: async (ctx, args) => {
    // Query all chunks for this source
    // Note: chunks don't have a sourceId index, so we need to scan
    const chunks = await ctx.db
      .query("chunks")
      .filter((q) => q.eq(q.field("sourceId"), args.sourceId))
      .collect();

    // Delete all chunks
    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    return { deletedCount: chunks.length };
  },
});

/**
 * Internal mutation to insert chunks during retraining.
 */
export const insertChunksForRetrain = internalMutation({
  args: {
    chunks: v.array(
      v.object({
        organizationId: v.id("organizations"),
        agentId: v.id("agents"),
        sourceId: v.id("sources"),
        content: v.string(),
        embedding: v.array(v.float64()),
        embeddingModel: v.string(),
        metadata: v.object({
          sourceType: v.string(),
          sourceName: v.string(),
          pageNumber: v.optional(v.number()),
          url: v.optional(v.string()),
          chunkIndex: v.number(),
        }),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const insertPromises = args.chunks.map((chunk) =>
      ctx.db.insert("chunks", {
        ...chunk,
        createdAt: now,
      })
    );

    await Promise.all(insertPromises);

    return { insertedCount: args.chunks.length };
  },
});

/**
 * Internal mutation to update source's embeddedContentHash after retraining.
 */
export const updateSourceEmbeddedHash = internalMutation({
  args: {
    sourceId: v.id("sources"),
    embeddedContentHash: v.optional(v.string()),
    chunkCount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sourceId, {
      embeddedContentHash: args.embeddedContentHash,
      chunkCount: args.chunkCount,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal mutation to complete retraining - updates agent lastTrainedAt and needsRetraining.
 */
export const completeRetraining = internalMutation({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      needsRetraining: false,
      lastTrainedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Chunking configuration - same as in sources.ts for consistency.
 */
const CHUNK_SIZE_TOKENS = 500;
const CHUNK_OVERLAP_TOKENS = 100;
const CHARS_PER_TOKEN = 4;

/**
 * Chunk text into smaller pieces with overlap.
 */
function chunkText(text: string): { content: string; chunkIndex: number }[] {
  const chunkSizeChars = CHUNK_SIZE_TOKENS * CHARS_PER_TOKEN;
  const overlapChars = CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN;

  const chunks: { content: string; chunkIndex: number }[] = [];
  let position = 0;
  let chunkIndex = 0;

  // Clean the text - normalize whitespace
  const cleanedText = text.replace(/\s+/g, " ").trim();

  // If text is small enough, return as single chunk
  if (cleanedText.length <= chunkSizeChars) {
    return [{ content: cleanedText, chunkIndex: 0 }];
  }

  while (position < cleanedText.length) {
    let end = Math.min(position + chunkSizeChars, cleanedText.length);

    // If not at the end, try to break at a sentence or word boundary
    if (end < cleanedText.length) {
      const searchStart = Math.max(
        position,
        end - Math.floor(chunkSizeChars * 0.2)
      );
      const searchRegion = cleanedText.slice(searchStart, end);
      const sentenceMatch = searchRegion.match(/[.!?]\s+(?=[A-Z])/g);

      if (sentenceMatch) {
        const lastMatch = sentenceMatch[sentenceMatch.length - 1];
        const boundaryIndex = searchRegion.lastIndexOf(lastMatch);
        if (boundaryIndex !== -1) {
          end = searchStart + boundaryIndex + lastMatch.length - 1;
        }
      } else {
        const lastSpace = cleanedText.lastIndexOf(" ", end);
        if (lastSpace > position) {
          end = lastSpace;
        }
      }
    }

    const chunkContent = cleanedText.slice(position, end).trim();

    if (chunkContent.length > 0) {
      chunks.push({
        content: chunkContent,
        chunkIndex,
      });
      chunkIndex++;
    }

    position = end - overlapChars;

    if (position <= 0 || position >= cleanedText.length - 1) {
      break;
    }

    const minProgress = chunks.length > 0 ? end - chunkSizeChars : 0;
    if (position <= minProgress) {
      position = end;
    }
  }

  return chunks;
}
