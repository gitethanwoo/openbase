import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { embedMany } from "ai";

let _openrouter: ReturnType<typeof createOpenRouter> | null = null;

function getOpenRouter(): ReturnType<typeof createOpenRouter> {
  if (_openrouter) {
    return _openrouter;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  _openrouter = createOpenRouter({ apiKey });
  return _openrouter;
}

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
 * Get an agent by slug for public help page.
 * Searches across all organizations. If multiple agents have the same slug,
 * returns the first active one found.
 */
export const getAgentBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    // Query all agents with this slug
    const agents = await ctx.db
      .query("agents")
      .filter((q) =>
        q.and(
          q.eq(q.field("slug"), args.slug),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .collect();

    // Find the first active agent (prefer active over draft/paused)
    const activeAgent = agents.find((a) => a.status === "active");
    if (activeAgent) {
      return activeAgent;
    }

    // If no active agent, return the first non-archived one
    const nonArchivedAgent = agents.find((a) => a.status !== "archived");
    return nonArchivedAgent ?? null;
  },
});

/**
 * List all agents for an organization.
 */
export const listAgents = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("desc")
      .collect();

    return agents;
  },
});

/**
 * Create a new agent.
 */
export const createAgent = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    model: v.string(),
    systemPrompt: v.string(),
    temperature: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org || org.deletedAt) {
      throw new Error("Organization not found");
    }

    // Check agent limit (agentLimit of -1 means unlimited)
    const agentLimit = org.agentLimit ?? 1;
    const agentCount = org.agentCount ?? 0;
    if (agentLimit !== -1 && agentCount >= agentLimit) {
      throw new Error(
        `Agent limit reached. Your plan allows ${agentLimit} agent${agentLimit === 1 ? "" : "s"}. Please upgrade to create more agents.`
      );
    }

    // Generate slug from name
    const baseSlug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);

    // Ensure slug is unique within organization
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await ctx.db
        .query("agents")
        .withIndex("by_organizationId_slug", (q) =>
          q.eq("organizationId", args.organizationId).eq("slug", slug)
        )
        .first();

      if (!existing || existing.deletedAt) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const now = Date.now();

    const agentId = await ctx.db.insert("agents", {
      organizationId: args.organizationId,
      name: args.name,
      slug,
      model: args.model,
      temperature: args.temperature ?? 0.7,
      systemPrompt: args.systemPrompt,
      embeddingModel: "text-embedding-3-small",
      embeddingDimensions: 1536,
      widgetConfig: {
        primaryColor: "#6366f1",
        welcomeMessage: "Hi! How can I help you today?",
        placeholderText: "Type your message...",
        position: "bottom-right",
      },
      status: "draft",
      needsRetraining: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    // Increment agent count for the organization
    await ctx.db.patch(args.organizationId, {
      agentCount: (org.agentCount ?? 0) + 1,
    });

    return agentId;
  },
});

/**
 * Update an existing agent.
 */
export const updateAgent = mutation({
  args: {
    agentId: v.id("agents"),
    name: v.optional(v.string()),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    temperature: v.optional(v.number()),
    status: v.optional(v.string()),
    widgetConfig: v.optional(
      v.object({
        primaryColor: v.string(),
        avatarUrl: v.optional(v.string()),
        welcomeMessage: v.string(),
        placeholderText: v.string(),
        position: v.string(),
      })
    ),
    leadCaptureConfig: v.optional(
      v.object({
        enabled: v.boolean(),
        triggerMode: v.string(),
        triggerAfterMessages: v.optional(v.number()),
        title: v.string(),
        description: v.optional(v.string()),
        fields: v.array(
          v.object({
            id: v.string(),
            type: v.string(),
            label: v.string(),
            placeholder: v.optional(v.string()),
            required: v.boolean(),
            options: v.optional(v.array(v.string())),
          })
        ),
        submitButtonText: v.string(),
        successMessage: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.deletedAt) {
      throw new Error("Agent not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name;
      // Update slug if name changed
      const baseSlug = args.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 30);

      let slug = baseSlug;
      let counter = 1;
      while (true) {
        const existing = await ctx.db
          .query("agents")
          .withIndex("by_organizationId_slug", (q) =>
            q.eq("organizationId", agent.organizationId).eq("slug", slug)
          )
          .first();

        if (!existing || existing._id === args.agentId || existing.deletedAt) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      updates.slug = slug;
    }

    if (args.model !== undefined) updates.model = args.model;
    if (args.systemPrompt !== undefined) updates.systemPrompt = args.systemPrompt;
    if (args.temperature !== undefined) updates.temperature = args.temperature;
    if (args.status !== undefined) updates.status = args.status;
    if (args.widgetConfig !== undefined) updates.widgetConfig = args.widgetConfig;
    if (args.leadCaptureConfig !== undefined) updates.leadCaptureConfig = args.leadCaptureConfig;

    await ctx.db.patch(args.agentId, updates);

    return args.agentId;
  },
});

/**
 * Soft delete an agent.
 */
export const deleteAgent = mutation({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.deletedAt) {
      throw new Error("Agent not found");
    }

    await ctx.db.patch(args.agentId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
      status: "archived",
    });

    // Decrement agent count for the organization
    const org = await ctx.db.get(agent.organizationId);
    if (org && !org.deletedAt && (org.agentCount ?? 0) > 0) {
      await ctx.db.patch(agent.organizationId, {
        agentCount: (org.agentCount ?? 0) - 1,
      });
    }

    return args.agentId;
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
    const openrouter = getOpenRouter();

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
      const embeddingResponse = await embedMany({
        model: openrouter.textEmbeddingModel(args.embeddingModel),
        values: texts,
      });

      // Prepare chunks with embeddings
      const chunksWithEmbeddings = chunks.map((chunk, index) => ({
        organizationId: args.organizationId,
        agentId: args.agentId,
        sourceId,
        content: chunk.content,
        embedding: embeddingResponse.embeddings[index],
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
