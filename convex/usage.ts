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

/**
 * Get usage summary for dashboard display.
 * Returns all usage metrics for an organization.
 */
export const getUsageSummary = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org || org.deletedAt) {
      return null;
    }

    // Get total conversations
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_organizationId_agentId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Get total sources across all agents
    const sources = await ctx.db
      .query("sources")
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .collect();

    // Get messages from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    const messagesQuery = await ctx.db
      .query("messages")
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.gte(q.field("createdAt"), todayTimestamp)
        )
      )
      .collect();

    const messagesToday = messagesQuery.filter((m) => m.role === "assistant").length;

    return {
      // Plan info
      plan: org.plan,
      billingCycleStart: org.billingCycleStart,

      // Message credits
      messageCreditsUsed: org.messageCreditsUsed,
      messageCreditsLimit: org.messageCreditsLimit,
      messageCreditsPercent: Math.round(
        (org.messageCreditsUsed / org.messageCreditsLimit) * 100
      ),

      // Storage
      storageUsedKb: org.storageUsedKb,
      storageLimitKb: org.storageLimitKb,
      storagePercent: Math.round(
        (org.storageUsedKb / org.storageLimitKb) * 100
      ),

      // Agents
      agentCount: org.agentCount,
      agentLimit: org.agentLimit,
      agentPercent: org.agentLimit === -1 ? 0 : Math.round(
        (org.agentCount / org.agentLimit) * 100
      ),

      // Activity metrics
      totalConversations: conversations.length,
      totalSources: sources.length,
      messagesToday,
    };
  },
});
