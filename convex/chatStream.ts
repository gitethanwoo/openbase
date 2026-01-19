import { httpAction } from "./_generated/server";
import { internal, components, api } from "./_generated/api";
import {
  PersistentTextStreaming,
  StreamId,
} from "@convex-dev/persistent-text-streaming";
import { buildRAGPrompt, buildMessages, extractCitations, type ConversationMessage } from "./rag";
import { Id } from "./_generated/dataModel";
import {
  createDefaultClient,
  streamChatCompletion,
  type ChatMessage,
  type ChatCompletionUsage,
  OpenRouterAPIError,
} from "./openrouter";
import { FALLBACK_RESPONSE } from "./judge";
import { logChatCompletion } from "./braintrust";

// Initialize the persistent text streaming component
const persistentTextStreaming = new PersistentTextStreaming(
  components.persistentTextStreaming
);

/**
 * Request body for the chat stream endpoint.
 */
interface ChatStreamRequest {
  streamId: string;
  conversationId: string;
  messageId: string;
  userMessage: string;
  embedding?: number[]; // Pre-computed embedding for RAG
}

/**
 * HTTP action that handles streaming chat responses.
 *
 * This endpoint:
 * 1. Receives a chat request with streamId, conversationId, and user message
 * 2. Retrieves relevant chunks via vector search (if embedding provided)
 * 3. Builds the RAG prompt with context
 * 4. Streams tokens to the client via persistent-text-streaming
 * 5. Updates the message in the database when complete
 */
export const streamChat = httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const body = (await request.json()) as ChatStreamRequest;
  const { streamId, conversationId, messageId, userMessage, embedding } = body;

  // Get conversation to access agent config
  const conversation = await ctx.runQuery(api.chat.getConversation, {
    conversationId: conversationId as Id<"conversations">,
  });

  if (!conversation) {
    return new Response(JSON.stringify({ error: "Conversation not found" }), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Get conversation history for context
  const history = await ctx.runQuery(api.chat.getConversationHistory, {
    conversationId: conversationId as Id<"conversations">,
    limit: 10, // Last 10 messages for context
  });

  // Remove the last message (current user message) from history
  const previousHistory = history.slice(0, -1);

  // Perform RAG if embedding is provided
  let chunks: Awaited<ReturnType<typeof ctx.runAction>> = [];
  if (embedding && embedding.length > 0) {
    chunks = await ctx.runAction(api.chunks.vectorSearch, {
      organizationId: conversation.organizationId,
      agentId: conversation.agentId,
      embedding,
      limit: 5,
    });
  }

  // Build RAG prompt
  const ragPrompt = buildRAGPrompt({
    agentConfig: conversation.agentConfigSnapshot,
    chunks,
    maxContextTokens: 4000,
  });

  // Build messages array
  const messagesResult = buildMessages({
    ragPrompt,
    userMessage,
    conversationHistory: previousHistory,
    maxHistoryTokens: 2000,
  });

  // Track timing and tokens
  const startTime = Date.now();
  let completionContent = "";
  let usage: ChatCompletionUsage | undefined;
  let actualModel = conversation.agentConfigSnapshot.model;

  // Get model and temperature from agent config
  const model = conversation.agentConfigSnapshot.model;
  const temperature = conversation.agentConfigSnapshot.temperature;

  // Convert messages to OpenRouter format
  const openRouterMessages: ChatMessage[] = messagesResult.messages.map(
    (msg: ConversationMessage) => ({
      role: msg.role,
      content: msg.content,
    })
  );

  // Generator function that calls the LLM via OpenRouter client
  const generateChat = async (
    _ctx: typeof ctx,
    _request: Request,
    _streamId: StreamId,
    chunkAppender: (chunk: string) => Promise<void>
  ) => {
    // Create OpenRouter client (throws if API key not configured)
    const client = createDefaultClient();

    try {
      // Stream the completion using the OpenRouter client
      const result = await streamChatCompletion(
        client,
        {
          model,
          messages: openRouterMessages,
          temperature,
          stream: true,
        },
        async (chunk) => {
          completionContent += chunk;
          await chunkAppender(chunk);
        }
      );

      // Capture usage stats from the result
      usage = result.usage;
      actualModel = result.model;
    } catch (error) {
      if (error instanceof OpenRouterAPIError) {
        throw new Error(
          `OpenRouter API error (${error.statusCode}): ${error.message}`
        );
      }
      throw error;
    }
  };

  // Stream the response
  const response = await persistentTextStreaming.stream(
    ctx,
    request,
    streamId as StreamId,
    generateChat
  );

  // After streaming completes, update the message in the database
  const latencyMs = Date.now() - startTime;
  const citations = extractCitations(ragPrompt.chunksUsed);

  // Convert citations to the format expected by the database
  const dbCitations = citations.map((c) => ({
    chunkId: c.chunkId as Id<"chunks">,
    sourceId: c.sourceId as Id<"sources">,
    sourceName: c.sourceName,
    sourceType: c.sourceType,
    contentSnippet: c.contentSnippet,
    url: c.url,
    pageNumber: c.pageNumber,
  }));

  // Build context string for judge evaluation (from RAG chunks)
  const contextForJudge = ragPrompt.chunksUsed
    .map((c) => c.content)
    .join("\n\n---\n\n");

  // Log chat completion to Braintrust
  logChatCompletion({
    messages: openRouterMessages,
    output: completionContent,
    model: actualModel,
    latencyMs,
    tokensPrompt: usage?.prompt_tokens,
    tokensCompletion: usage?.completion_tokens,
    organizationId: conversation.organizationId,
    agentId: conversation.agentId,
    conversationId,
    messageId,
    context: contextForJudge,
  });

  // Run LLM-as-judge safety evaluation
  let finalContent = completionContent;

  const judgeResult = await ctx.runAction(internal.judge.evaluateResponse, {
    response: completionContent,
    systemPrompt: ragPrompt.systemPrompt,
    context: contextForJudge,
    userMessage,
    // Pass context for Braintrust logging
    organizationId: conversation.organizationId,
    agentId: conversation.agentId,
    conversationId,
    messageId,
  });

  // If judge fails the response, replace with fallback
  if (!judgeResult.passed) {
    judgeResult.originalContent = completionContent;
    finalContent = FALLBACK_RESPONSE;
  }

  // Update message with final content, usage stats, and judge evaluation
  await ctx.runMutation(internal.chat.updateMessageAfterStream, {
    messageId: messageId as Id<"messages">,
    content: finalContent,
    model: actualModel,
    latencyMs,
    tokensPrompt: usage?.prompt_tokens,
    tokensCompletion: usage?.completion_tokens,
    chunksUsed: ragPrompt.chunksUsed.map((c) => c.chunkId as Id<"chunks">),
    citations: dbCitations,
    judgeEvaluation: judgeResult,
  });

  // Set CORS headers on response
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Vary", "Origin");

  return response;
});
