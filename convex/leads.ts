import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a new lead and optionally link it to a conversation.
 */
export const createLead = mutation({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("agents"),
    conversationId: v.optional(v.id("conversations")),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    customFields: v.optional(v.record(v.string(), v.string())),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify agent exists and belongs to organization
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.deletedAt) {
      throw new Error("Agent not found");
    }
    if (agent.organizationId !== args.organizationId) {
      throw new Error("Agent does not belong to organization");
    }

    const now = Date.now();

    // Create the lead
    const leadId = await ctx.db.insert("leads", {
      organizationId: args.organizationId,
      agentId: args.agentId,
      conversationId: args.conversationId,
      name: args.name,
      email: args.email,
      phone: args.phone,
      customFields: args.customFields,
      source: args.source,
      createdAt: now,
    });

    // If linked to a conversation, update the conversation with the lead ID
    if (args.conversationId) {
      const conversation = await ctx.db.get(args.conversationId);
      if (conversation && !conversation.leadId) {
        await ctx.db.patch(args.conversationId, {
          leadId: leadId,
        });
      }
    }

    return leadId;
  },
});

/**
 * List leads for an organization with optional filtering.
 */
export const listLeads = query({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("agents")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let baseQuery = ctx.db
      .query("leads")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      );

    if (args.agentId) {
      baseQuery = baseQuery.filter((q) =>
        q.eq(q.field("agentId"), args.agentId)
      );
    }

    const leads = await baseQuery.order("desc").take(limit);

    return leads;
  },
});

/**
 * Get a single lead by ID.
 */
export const getLead = query({
  args: {
    leadId: v.id("leads"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.leadId);
  },
});

/**
 * Get lead for a conversation.
 */
export const getLeadByConversation = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.leadId) {
      return null;
    }
    return await ctx.db.get(conversation.leadId);
  },
});
