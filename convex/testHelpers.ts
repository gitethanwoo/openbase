/**
 * Test helper functions for development and testing.
 * Run via: npx convex run testHelpers:createTestData
 */

import { mutation, query } from "./_generated/server";

/**
 * Create test data for chat testing.
 * Creates a test organization and agent.
 */
export const createTestData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Check if test org already exists
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "test-org"))
      .first();

    let organizationId;
    if (existingOrg) {
      organizationId = existingOrg._id;
      console.log("Test organization already exists:", organizationId);
    } else {
      // Create test organization
      organizationId = await ctx.db.insert("organizations", {
        name: "Test Organization",
        slug: "test-org",
        vertical: "general",
        allowedDomains: ["localhost", "test.com"],
        rateLimitTokens: 10000,
        rateLimitLastRefill: now,
        plan: "free",
        messageCreditsUsed: 0,
        messageCreditsLimit: 1000,
        storageUsedKb: 0,
        storageLimitKb: 100000,
        agentCount: 0,
        agentLimit: 1,
        billingCycleStart: now,
        defaultModel: "openai/gpt-4o-mini",
        createdAt: now,
      });
      console.log("Created test organization:", organizationId);
    }

    // Check if test agent exists
    const existingAgent = await ctx.db
      .query("agents")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .first();

    let agentId;
    if (existingAgent) {
      agentId = existingAgent._id;
      console.log("Test agent already exists:", agentId);
    } else {
      // Create test agent
      agentId = await ctx.db.insert("agents", {
        organizationId,
        name: "Test Assistant",
        slug: "test-assistant",
        model: "openai/gpt-4o-mini",
        temperature: 0.7,
        systemPrompt:
          "You are a helpful assistant for a test organization. Be friendly and concise in your responses. Always try to help the user with their questions.",
        embeddingModel: "text-embedding-3-small",
        embeddingDimensions: 1536,
        widgetConfig: {
          primaryColor: "#6366f1",
          welcomeMessage: "Hello! How can I help you today?",
          placeholderText: "Type your message...",
          position: "bottom-right",
        },
        status: "active",
        needsRetraining: false,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
      console.log("Created test agent:", agentId);
    }

    return {
      organizationId,
      agentId,
    };
  },
});

/**
 * Get test data IDs.
 */
export const getTestData = query({
  args: {},
  handler: async (ctx) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "test-org"))
      .first();

    if (!org) {
      return null;
    }

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", org._id))
      .first();

    return {
      organizationId: org._id,
      agentId: agent?._id,
    };
  },
});

/**
 * List all conversations (for debugging).
 */
export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    const conversations = await ctx.db.query("conversations").take(10);
    return conversations;
  },
});

/**
 * List all messages (for debugging).
 */
export const listMessages = query({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db.query("messages").take(20);
    return messages;
  },
});
