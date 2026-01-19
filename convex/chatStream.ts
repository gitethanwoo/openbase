import { httpAction } from "./_generated/server";
import { internal, components, api } from "./_generated/api";
import {
  PersistentTextStreaming,
  StreamId,
} from "@convex-dev/persistent-text-streaming";
import { buildRAGPrompt, buildMessages, extractCitations } from "./rag";
import { Id } from "./_generated/dataModel";

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
  let totalTokens = 0;
  let completionContent = "";

  // Generator function that calls the LLM and yields chunks
  const generateChat = async (
    _ctx: typeof ctx,
    _request: Request,
    _streamId: StreamId,
    chunkAppender: (chunk: string) => Promise<void>
  ) => {
    // Get OpenRouter API key from environment
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    const model = conversation.agentConfigSnapshot.model;
    const temperature = conversation.agentConfigSnapshot.temperature;

    // Call OpenRouter API with streaming
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterApiKey}`,
          "HTTP-Referer": process.env.CONVEX_SITE_URL ?? "https://localhost",
          "X-Title": "ClaudeBase Chat",
        },
        body: JSON.stringify({
          model,
          messages: messagesResult.messages,
          temperature,
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            completionContent += content;
            await chunkAppender(content);
          }

          // Track usage if provided
          if (parsed.usage) {
            totalTokens = parsed.usage.total_tokens ?? 0;
          }
        }
      }
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
    url: c.url,
    pageNumber: c.pageNumber,
  }));

  // Update message with final content
  await ctx.runMutation(internal.chat.updateMessageAfterStream, {
    messageId: messageId as Id<"messages">,
    content: completionContent,
    model: conversation.agentConfigSnapshot.model,
    latencyMs,
    tokensCompletion: totalTokens,
    chunksUsed: ragPrompt.chunksUsed.map((c) => c.chunkId as Id<"chunks">),
    citations: dbCitations,
  });

  // Set CORS headers on response
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Vary", "Origin");

  return response;
});
