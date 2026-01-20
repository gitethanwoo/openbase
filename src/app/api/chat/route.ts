import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, type ModelMessage } from "ai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

// Create OpenRouter client
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

// Convex client for server-side operations
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface ChatRequest {
  messages: ModelMessage[];
  conversationId?: string;
  organizationId?: string;
  agentId?: string;
  visitorId?: string;
  model?: string;
  temperature?: number;
  systemPrompt?: string;
  skipJudge?: boolean;
}

export async function POST(req: Request) {
  const body: ChatRequest = await req.json();
  const {
    messages,
    conversationId,
    organizationId,
    agentId,
    visitorId,
    model = "openai/gpt-4o-mini",
    temperature = 0.7,
    systemPrompt,
    skipJudge = false,
  } = body;

  // Get the last user message
  const lastUserMessage = messages.filter((m) => m.role === "user").pop();
  if (!lastUserMessage) {
    return new Response(JSON.stringify({ error: "No user message found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Extract user message content as string
  const userMessageContent =
    typeof lastUserMessage.content === "string"
      ? lastUserMessage.content
      : Array.isArray(lastUserMessage.content)
        ? lastUserMessage.content
            .filter((p) => p.type === "text")
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("")
        : "";

  // Track conversation and message IDs for persistence
  let activeConversationId = conversationId;
  let assistantMessageId: string | undefined;

  // If we have org/agent context, create or continue conversation in Convex
  if (organizationId && agentId) {
    try {
      if (!activeConversationId) {
        // Create new conversation
        const result = await convex.mutation(api.chat.createConversation, {
          organizationId: organizationId as Id<"organizations">,
          agentId: agentId as Id<"agents">,
          visitorId: visitorId ?? `visitor-${Date.now()}`,
          userMessage: userMessageContent,
        });
        activeConversationId = result.conversationId;
        assistantMessageId = result.assistantMessageId;
      } else {
        // Continue existing conversation
        const result = await convex.mutation(api.chat.sendMessage, {
          conversationId: activeConversationId as Id<"conversations">,
          userMessage: userMessageContent,
        });
        assistantMessageId = result.assistantMessageId;
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      // Continue without persistence
    }
  }

  // Build messages array with system prompt
  const aiMessages: ModelMessage[] = [];
  if (systemPrompt) {
    aiMessages.push({ role: "system", content: systemPrompt });
  }
  aiMessages.push(...messages);

  const startTime = Date.now();

  // Stream the response using AI SDK with OpenRouter
  const result = streamText({
    model: openrouter.chat(model),
    messages: aiMessages,
    temperature,
    onFinish: async ({ text, usage }) => {
      const latencyMs = Date.now() - startTime;

      // Persist to Convex if we have a message ID
      if (assistantMessageId) {
        try {
          if (skipJudge) {
            // Simple save without judge evaluation
            await convex.mutation(api.chatApi.saveMessage, {
              messageId: assistantMessageId as Id<"messages">,
              content: text,
              model,
              tokensPrompt: usage?.inputTokens,
              tokensCompletion: usage?.outputTokens,
              latencyMs,
            });
          } else {
            // Full save with judge evaluation
            await convex.action(api.chatApi.finalizeMessage, {
              messageId: assistantMessageId as Id<"messages">,
              content: text,
              model,
              tokensPrompt: usage?.inputTokens,
              tokensCompletion: usage?.outputTokens,
              latencyMs,
              systemPrompt: systemPrompt ?? "",
              userMessage: userMessageContent,
              organizationId,
              agentId,
              conversationId: activeConversationId,
            });
          }
        } catch (error) {
          console.error("Error saving message:", error);
        }
      }
    },
  });

  // Return streaming response
  const response = result.toTextStreamResponse();

  // Add conversation ID to response headers for client to track
  if (activeConversationId) {
    response.headers.set("X-Conversation-Id", activeConversationId);
  }

  return response;
}
