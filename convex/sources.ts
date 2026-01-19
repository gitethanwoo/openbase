import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
