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
