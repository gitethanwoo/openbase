import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { components } from "./_generated/api";
import { PersistentTextStreaming, StreamId, StreamIdValidator } from "@convex-dev/persistent-text-streaming";

// Initialize the persistent text streaming component
export const persistentTextStreaming = new PersistentTextStreaming(
  components.persistentTextStreaming
);

/**
 * Create a new conversation with a stream ID for the assistant's response.
 * Returns the conversation ID and stream ID to start streaming.
 */
export const createConversation = mutation({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("agents"),
    visitorId: v.string(),
    userMessage: v.string(),
    origin: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the agent to capture config snapshot
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }
    if (agent.organizationId !== args.organizationId) {
      throw new Error("Agent does not belong to organization");
    }

    const now = Date.now();

    // Create the conversation
    const conversationId = await ctx.db.insert("conversations", {
      organizationId: args.organizationId,
      agentId: args.agentId,
      agentVersion: agent.version,
      agentConfigSnapshot: {
        name: agent.name,
        model: agent.model,
        temperature: agent.temperature,
        systemPrompt: agent.systemPrompt,
      },
      visitorId: args.visitorId,
      origin: args.origin,
      userAgent: args.userAgent,
      messageCount: 1,
      topics: [],
      createdAt: now,
      lastMessageAt: now,
    });

    // Create the user message
    await ctx.db.insert("messages", {
      organizationId: args.organizationId,
      conversationId,
      role: "user",
      content: args.userMessage,
      createdAt: now,
    });

    // Create a stream for the assistant's response
    const streamId = await persistentTextStreaming.createStream(ctx);

    // Create the assistant message placeholder with stream ID
    const assistantMessageId = await ctx.db.insert("messages", {
      organizationId: args.organizationId,
      conversationId,
      role: "assistant",
      content: "", // Will be populated as stream completes
      streamId: streamId as string,
      createdAt: now + 1, // Ensure it comes after user message
    });

    return {
      conversationId,
      assistantMessageId,
      streamId,
    };
  },
});

/**
 * Send a message in an existing conversation.
 * Creates a user message and a placeholder assistant message with a stream ID.
 */
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    userMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const now = Date.now();

    // Create the user message
    await ctx.db.insert("messages", {
      organizationId: conversation.organizationId,
      conversationId: args.conversationId,
      role: "user",
      content: args.userMessage,
      createdAt: now,
    });

    // Create a stream for the assistant's response
    const streamId = await persistentTextStreaming.createStream(ctx);

    // Create the assistant message placeholder with stream ID
    const assistantMessageId = await ctx.db.insert("messages", {
      organizationId: conversation.organizationId,
      conversationId: args.conversationId,
      role: "assistant",
      content: "", // Will be populated as stream completes
      streamId: streamId as string,
      createdAt: now + 1,
    });

    // Update conversation
    await ctx.db.patch(args.conversationId, {
      messageCount: conversation.messageCount + 2, // user + assistant
      lastMessageAt: now,
    });

    return {
      assistantMessageId,
      streamId,
    };
  },
});

/**
 * Get the body of a stream by its ID.
 * Used by the client to subscribe to stream content via the database.
 */
export const getStreamBody = query({
  args: {
    streamId: StreamIdValidator,
  },
  handler: async (ctx, args) => {
    return await persistentTextStreaming.getStreamBody(
      ctx,
      args.streamId as StreamId
    );
  },
});

/**
 * Get messages for a conversation.
 */
export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    return messages.sort((a, b) => a.createdAt - b.createdAt);
  },
});

/**
 * Get a conversation by ID.
 */
export const getConversation = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

/**
 * Get conversation history for building LLM context.
 */
export const getConversationHistory = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    // Sort by creation time and take the most recent messages
    const sorted = messages.sort((a, b) => a.createdAt - b.createdAt);
    const recent = sorted.slice(-limit);

    return recent.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));
  },
});

/**
 * Internal mutation to update a message after streaming completes.
 * Also records a usage event for billing and monitoring.
 */
export const updateMessageAfterStream = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    model: v.optional(v.string()),
    tokensPrompt: v.optional(v.number()),
    tokensCompletion: v.optional(v.number()),
    latencyMs: v.optional(v.number()),
    chunksUsed: v.optional(v.array(v.id("chunks"))),
    citations: v.optional(
      v.array(
        v.object({
          chunkId: v.id("chunks"),
          sourceId: v.id("sources"),
          sourceName: v.string(),
          sourceType: v.string(),
          contentSnippet: v.string(),
          url: v.optional(v.string()),
          pageNumber: v.optional(v.number()),
        })
      )
    ),
    judgeEvaluation: v.optional(
      v.object({
        passed: v.boolean(),
        safetyScore: v.number(),
        groundednessScore: v.number(),
        brandAlignmentScore: v.number(),
        reasoning: v.string(),
        flagged: v.boolean(),
        originalContent: v.optional(v.string()),
        judgeModel: v.string(),
        judgeLatencyMs: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { messageId, ...updates } = args;

    // Update the message
    await ctx.db.patch(messageId, updates);

    // Record usage event if we have token usage data
    if (
      args.tokensPrompt !== undefined &&
      args.tokensCompletion !== undefined &&
      args.model !== undefined &&
      args.latencyMs !== undefined
    ) {
      // Get the message to find conversation and organization
      const message = await ctx.db.get(messageId);
      if (message) {
        const conversation = await ctx.db.get(message.conversationId);
        if (conversation) {
          // Use messageId as the idempotency key to prevent duplicates
          const idempotencyKey = `chat:${messageId}`;

          // Check for existing event with same idempotency key
          const existing = await ctx.db
            .query("usageEvents")
            .withIndex("by_idempotencyKey", (q) =>
              q.eq("idempotencyKey", idempotencyKey)
            )
            .first();

          if (!existing) {
            await ctx.db.insert("usageEvents", {
              organizationId: message.organizationId,
              agentId: conversation.agentId,
              conversationId: message.conversationId,
              messageId: messageId,
              eventType: "chat_completion",
              model: args.model,
              tokensPrompt: args.tokensPrompt,
              tokensCompletion: args.tokensCompletion,
              latencyMs: args.latencyMs,
              idempotencyKey: idempotencyKey,
              createdAt: Date.now(),
            });
          }
        }
      }
    }
  },
});
