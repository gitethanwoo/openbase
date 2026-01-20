/**
 * Public API for chat operations from Next.js API routes.
 * These functions are called by the AI SDK chat route after streaming completes.
 */

import { mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { JudgeResult } from "./judge";

/**
 * Finalize a chat message after streaming completes.
 * Updates the message content and runs judge evaluation.
 */
export const finalizeMessage = action({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    model: v.string(),
    tokensPrompt: v.optional(v.number()),
    tokensCompletion: v.optional(v.number()),
    latencyMs: v.number(),
    // For judge evaluation
    systemPrompt: v.string(),
    userMessage: v.string(),
    // Optional context
    organizationId: v.optional(v.string()),
    agentId: v.optional(v.string()),
    conversationId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; passed: boolean; content: string }> => {
    // Run judge evaluation
    const judgeResult: JudgeResult = await ctx.runAction(
      internal.judge.evaluateResponse,
      {
        response: args.content,
        systemPrompt: args.systemPrompt,
        context: "", // No RAG context in simple API route
        userMessage: args.userMessage,
        organizationId: args.organizationId,
        agentId: args.agentId,
        conversationId: args.conversationId,
        messageId: args.messageId,
      }
    );

    // Determine final content based on judge result
    const finalContent = judgeResult.passed
      ? args.content
      : "I apologize, but I'm unable to provide a helpful response to that request. Please try rephrasing your question.";

    // Update the message
    await ctx.runMutation(internal.chat.updateMessageAfterStream, {
      messageId: args.messageId,
      content: finalContent,
      model: args.model,
      tokensPrompt: args.tokensPrompt,
      tokensCompletion: args.tokensCompletion,
      latencyMs: args.latencyMs,
      chunksUsed: [],
      citations: [],
      judgeEvaluation: {
        ...judgeResult,
        originalContent: judgeResult.passed ? undefined : args.content,
      },
    });

    return {
      success: true,
      passed: judgeResult.passed,
      content: finalContent,
    };
  },
});

/**
 * Simple message finalization without judge (for faster responses).
 */
export const saveMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    model: v.string(),
    tokensPrompt: v.optional(v.number()),
    tokensCompletion: v.optional(v.number()),
    latencyMs: v.number(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const { messageId, ...updates } = args;

    await ctx.db.patch(messageId, updates);

    // Record usage event
    const message = await ctx.db.get(messageId);
    if (message && args.tokensPrompt && args.tokensCompletion) {
      const conversation = await ctx.db.get(message.conversationId);
      if (conversation) {
        const idempotencyKey = `chat:${messageId}`;
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
            messageId,
            eventType: "chat_completion",
            model: args.model,
            tokensPrompt: args.tokensPrompt,
            tokensCompletion: args.tokensCompletion,
            latencyMs: args.latencyMs,
            idempotencyKey,
            createdAt: Date.now(),
          });
        }
      }
    }

    return { success: true };
  },
});
