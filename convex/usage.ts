import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

/**
 * Record a usage event for billing and monitoring.
 * Uses idempotencyKey to prevent duplicate records.
 */
export const recordUsageEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("agents"),
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    eventType: v.string(),
    model: v.string(),
    tokensPrompt: v.number(),
    tokensCompletion: v.number(),
    latencyMs: v.number(),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for existing event with same idempotency key
    const existing = await ctx.db
      .query("usageEvents")
      .withIndex("by_idempotencyKey", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey)
      )
      .first();

    if (existing) {
      // Already recorded, return existing ID
      return existing._id;
    }

    // Insert new usage event
    const usageEventId = await ctx.db.insert("usageEvents", {
      organizationId: args.organizationId,
      agentId: args.agentId,
      conversationId: args.conversationId,
      messageId: args.messageId,
      eventType: args.eventType,
      model: args.model,
      tokensPrompt: args.tokensPrompt,
      tokensCompletion: args.tokensCompletion,
      latencyMs: args.latencyMs,
      idempotencyKey: args.idempotencyKey,
      createdAt: Date.now(),
    });

    return usageEventId;
  },
});

/**
 * Get usage events for an organization.
 */
export const getUsageEvents = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    const events = await ctx.db
      .query("usageEvents")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);

    return events;
  },
});
