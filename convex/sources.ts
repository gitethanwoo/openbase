import { v } from "convex/values";
import { mutation, query, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";

/**
 * Allowed MIME types for file uploads
 */
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "text/plain",
] as const;

type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

function isAllowedMimeType(mimeType: string): mimeType is AllowedMimeType {
  return ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType);
}

/**
 * Generate a signed URL for uploading a file to Convex storage.
 * The client will POST the file directly to this URL.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Create a file source record after uploading a file to Convex storage.
 * This validates the file type and creates the source with status 'pending'.
 */
export const createFileSource = mutation({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("agents"),
    fileId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    sizeKb: v.number(),
  },
  handler: async (ctx, args) => {
    // Validate MIME type
    if (!isAllowedMimeType(args.mimeType)) {
      throw new Error(
        `Invalid file type: ${args.mimeType}. Allowed types: PDF, DOCX, TXT`
      );
    }

    // Verify the organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org || org.deletedAt) {
      throw new Error("Organization not found");
    }

    // Verify the agent exists and belongs to the organization
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.deletedAt) {
      throw new Error("Agent not found");
    }
    if (agent.organizationId !== args.organizationId) {
      throw new Error("Agent does not belong to this organization");
    }

    // Check storage quota
    const newStorageUsed = org.storageUsedKb + args.sizeKb;
    if (newStorageUsed > org.storageLimitKb) {
      // Delete the uploaded file since we can't use it
      await ctx.storage.delete(args.fileId);
      throw new Error(
        `Storage limit exceeded. Used: ${org.storageUsedKb}KB, Limit: ${org.storageLimitKb}KB, File: ${args.sizeKb}KB`
      );
    }

    const now = Date.now();

    // Create the source record with 'pending' status
    const sourceId = await ctx.db.insert("sources", {
      organizationId: args.organizationId,
      agentId: args.agentId,
      type: "file",
      status: "pending",
      name: args.fileName,
      sizeKb: args.sizeKb,
      fileId: args.fileId,
      mimeType: args.mimeType,
      createdAt: now,
      updatedAt: now,
    });

    // Update organization storage usage
    await ctx.db.patch(args.organizationId, {
      storageUsedKb: newStorageUsed,
    });

    return { sourceId };
  },
});

/**
 * Get a source by ID.
 */
export const getSource = query({
  args: {
    sourceId: v.id("sources"),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source || source.deletedAt) {
      return null;
    }
    return source;
  },
});

/**
 * List sources for an agent.
 */
export const listSources = query({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    const sources = await ctx.db
      .query("sources")
      .withIndex("by_organizationId_agentId", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("agentId", args.agentId)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("desc")
      .take(limit);

    return sources;
  },
});

/**
 * Get a signed URL for downloading a file from storage.
 */
export const getFileUrl = query({
  args: {
    fileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.fileId);
  },
});

/**
 * Update source status (used by the file processing workflow).
 */
export const updateStatus = mutation({
  args: {
    sourceId: v.id("sources"),
    status: v.string(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source) {
      throw new Error("Source not found");
    }

    await ctx.db.patch(args.sourceId, {
      status: args.status,
      errorMessage: args.errorMessage,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Insert chunks with embeddings (used by the file processing workflow).
 * Handles batch insertion of chunks.
 */
export const insertChunks = mutation({
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

    // Insert all chunks
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
 * Finalize source processing - update chunk count and set status to ready.
 */
export const finalizeProcessing = mutation({
  args: {
    sourceId: v.id("sources"),
    chunkCount: v.number(),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source) {
      throw new Error("Source not found");
    }

    await ctx.db.patch(args.sourceId, {
      status: "ready",
      chunkCount: args.chunkCount,
      updatedAt: Date.now(),
    });

    // Mark the agent as needing retraining (new knowledge added)
    await ctx.db.patch(source.agentId, {
      needsRetraining: true,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Create a website source record for web scraping.
 * This validates the URL and creates the source with status 'pending'.
 */
export const createWebSource = mutation({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("agents"),
    url: v.string(),
    mode: v.union(v.literal("scrape"), v.literal("crawl")),
    crawlLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Basic URL validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(args.url);
    } catch {
      throw new Error("Invalid URL provided");
    }

    // Only allow http and https
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("URL must use http or https protocol");
    }

    // Verify the organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org || org.deletedAt) {
      throw new Error("Organization not found");
    }

    // Verify the agent exists and belongs to the organization
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.deletedAt) {
      throw new Error("Agent not found");
    }
    if (agent.organizationId !== args.organizationId) {
      throw new Error("Agent does not belong to this organization");
    }

    const now = Date.now();

    // Create a display name from the URL
    const displayName = parsedUrl.hostname + (parsedUrl.pathname !== "/" ? parsedUrl.pathname : "");

    // Create the source record with 'pending' status
    const sourceId = await ctx.db.insert("sources", {
      organizationId: args.organizationId,
      agentId: args.agentId,
      type: "website",
      status: "pending",
      name: displayName,
      url: args.url,
      crawledPages: 0,
      createdAt: now,
      updatedAt: now,
    });

    return {
      sourceId,
      mode: args.mode,
      crawlLimit: args.crawlLimit ?? 10,
    };
  },
});

/**
 * Update crawled pages count (used by the web scraping workflow).
 */
export const updateCrawledPages = mutation({
  args: {
    sourceId: v.id("sources"),
    crawledPages: v.number(),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source) {
      throw new Error("Source not found");
    }

    await ctx.db.patch(args.sourceId, {
      crawledPages: args.crawledPages,
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// Text Snippet and Q&A Manual Entry Mutations
// ============================================================================

/**
 * Chunking configuration for manual entries.
 * Using same parameters as file-processing workflow for consistency.
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

/**
 * Create a text snippet source.
 * The content is immediately processed (chunked and embedded).
 */
export const createTextSnippetSource = mutation({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("agents"),
    name: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate content is not empty
    if (!args.content.trim()) {
      throw new Error("Content cannot be empty");
    }

    // Validate name is not empty
    if (!args.name.trim()) {
      throw new Error("Name cannot be empty");
    }

    // Verify the organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org || org.deletedAt) {
      throw new Error("Organization not found");
    }

    // Verify the agent exists and belongs to the organization
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.deletedAt) {
      throw new Error("Agent not found");
    }
    if (agent.organizationId !== args.organizationId) {
      throw new Error("Agent does not belong to this organization");
    }

    const now = Date.now();

    // Create the source record with 'processing' status
    const sourceId = await ctx.db.insert("sources", {
      organizationId: args.organizationId,
      agentId: args.agentId,
      type: "text",
      status: "processing",
      name: args.name.trim(),
      content: args.content,
      createdAt: now,
      updatedAt: now,
    });

    // Schedule the embedding action
    await ctx.scheduler.runAfter(0, internal.sources.processManualSource, {
      sourceId,
      organizationId: args.organizationId,
      agentId: args.agentId,
      content: args.content,
      name: args.name.trim(),
      sourceType: "text",
      embeddingModel: agent.embeddingModel,
    });

    return { sourceId };
  },
});

/**
 * Create a Q&A pair source.
 * The Q&A pair is immediately processed (embedded as a single chunk).
 */
export const createQASource = mutation({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("agents"),
    question: v.string(),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate question is not empty
    if (!args.question.trim()) {
      throw new Error("Question cannot be empty");
    }

    // Validate answer is not empty
    if (!args.answer.trim()) {
      throw new Error("Answer cannot be empty");
    }

    // Verify the organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org || org.deletedAt) {
      throw new Error("Organization not found");
    }

    // Verify the agent exists and belongs to the organization
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.deletedAt) {
      throw new Error("Agent not found");
    }
    if (agent.organizationId !== args.organizationId) {
      throw new Error("Agent does not belong to this organization");
    }

    const now = Date.now();

    // Create a display name from the question (truncated)
    const displayName =
      args.question.trim().length > 50
        ? args.question.trim().slice(0, 47) + "..."
        : args.question.trim();

    // Create the source record with 'processing' status
    const sourceId = await ctx.db.insert("sources", {
      organizationId: args.organizationId,
      agentId: args.agentId,
      type: "qa",
      status: "processing",
      name: displayName,
      question: args.question.trim(),
      answer: args.answer.trim(),
      createdAt: now,
      updatedAt: now,
    });

    // For Q&A pairs, combine question and answer for embedding
    // This ensures the embedding captures both the query and response semantics
    const combinedContent = `Question: ${args.question.trim()}\n\nAnswer: ${args.answer.trim()}`;

    // Schedule the embedding action
    await ctx.scheduler.runAfter(0, internal.sources.processManualSource, {
      sourceId,
      organizationId: args.organizationId,
      agentId: args.agentId,
      content: combinedContent,
      name: displayName,
      sourceType: "qa",
      embeddingModel: agent.embeddingModel,
    });

    return { sourceId };
  },
});

/**
 * Internal action to process manual source entries (text snippets and Q&A pairs).
 * Generates embeddings and stores chunks.
 */
export const processManualSource = internalAction({
  args: {
    sourceId: v.id("sources"),
    organizationId: v.id("organizations"),
    agentId: v.id("agents"),
    content: v.string(),
    name: v.string(),
    sourceType: v.string(),
    embeddingModel: v.string(),
  },
  handler: async (ctx, args) => {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      await ctx.runMutation(internal.sources.updateStatusInternal, {
        sourceId: args.sourceId,
        status: "error",
        errorMessage: "OpenAI API key not configured",
      });
      return;
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    try {
      // Chunk the content
      const chunks = chunkText(args.content);

      if (chunks.length === 0) {
        await ctx.runMutation(internal.sources.updateStatusInternal, {
          sourceId: args.sourceId,
          status: "error",
          errorMessage: "No content to process",
        });
        return;
      }

      // Generate embeddings for all chunks
      const texts = chunks.map((chunk) => chunk.content);
      const embeddingResponse = await openai.embeddings.create({
        model: args.embeddingModel,
        input: texts,
      });

      // Prepare chunks with embeddings
      const chunksWithEmbeddings = chunks.map((chunk, index) => ({
        organizationId: args.organizationId,
        agentId: args.agentId,
        sourceId: args.sourceId,
        content: chunk.content,
        embedding: embeddingResponse.data[index].embedding,
        embeddingModel: args.embeddingModel,
        metadata: {
          sourceType: args.sourceType,
          sourceName: args.name,
          chunkIndex: chunk.chunkIndex,
        },
      }));

      // Store chunks
      await ctx.runMutation(internal.sources.insertChunksInternal, {
        chunks: chunksWithEmbeddings,
      });

      // Finalize the source
      await ctx.runMutation(internal.sources.finalizeProcessingInternal, {
        sourceId: args.sourceId,
        chunkCount: chunks.length,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.sources.updateStatusInternal, {
        sourceId: args.sourceId,
        status: "error",
        errorMessage,
      });
    }
  },
});

/**
 * Internal mutation to update source status (used by processManualSource action).
 */
export const updateStatusInternal = internalMutation({
  args: {
    sourceId: v.id("sources"),
    status: v.string(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source) {
      throw new Error("Source not found");
    }

    await ctx.db.patch(args.sourceId, {
      status: args.status,
      errorMessage: args.errorMessage,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal mutation to insert chunks (used by processManualSource action).
 */
export const insertChunksInternal = internalMutation({
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
 * Internal mutation to finalize source processing (used by processManualSource action).
 */
export const finalizeProcessingInternal = internalMutation({
  args: {
    sourceId: v.id("sources"),
    chunkCount: v.number(),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source) {
      throw new Error("Source not found");
    }

    await ctx.db.patch(args.sourceId, {
      status: "ready",
      chunkCount: args.chunkCount,
      updatedAt: Date.now(),
    });

    // Mark the agent as needing retraining (new knowledge added)
    await ctx.db.patch(source.agentId, {
      needsRetraining: true,
      updatedAt: Date.now(),
    });
  },
});
