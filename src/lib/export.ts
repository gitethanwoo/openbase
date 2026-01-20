import { Doc } from "../../convex/_generated/dataModel";

type ConversationWithMessages = Doc<"conversations"> & {
  messages: Doc<"messages">[];
};

interface ExportedMessage {
  conversationId: string;
  messageId: string;
  role: string;
  content: string;
  model?: string;
  tokensPrompt?: number;
  tokensCompletion?: number;
  latencyMs?: number;
  createdAt: string;
}

interface ExportedConversation {
  conversationId: string;
  visitorId: string;
  agentName: string;
  agentModel: string;
  messageCount: number;
  sentiment?: string;
  topics: string[];
  origin?: string;
  createdAt: string;
  lastMessageAt: string;
  messages: ExportedMessage[];
}

function formatISODate(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

function transformConversation(
  conversation: ConversationWithMessages
): ExportedConversation {
  return {
    conversationId: conversation._id,
    visitorId: conversation.visitorId,
    agentName: conversation.agentConfigSnapshot.name,
    agentModel: conversation.agentConfigSnapshot.model,
    messageCount: conversation.messageCount,
    sentiment: conversation.sentiment,
    topics: conversation.topics,
    origin: conversation.origin,
    createdAt: formatISODate(conversation.createdAt),
    lastMessageAt: formatISODate(conversation.lastMessageAt),
    messages: conversation.messages.map((msg) => ({
      conversationId: conversation._id,
      messageId: msg._id,
      role: msg.role,
      content: msg.content,
      model: msg.model,
      tokensPrompt: msg.tokensPrompt,
      tokensCompletion: msg.tokensCompletion,
      latencyMs: msg.latencyMs,
      createdAt: formatISODate(msg.createdAt),
    })),
  };
}

export function exportToJSON(
  conversations: ConversationWithMessages[]
): string {
  const exported = conversations.map(transformConversation);
  return JSON.stringify(exported, null, 2);
}

function escapeCSVField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function exportToCSV(conversations: ConversationWithMessages[]): string {
  const headers = [
    "conversation_id",
    "visitor_id",
    "agent_name",
    "agent_model",
    "message_count",
    "sentiment",
    "topics",
    "origin",
    "conversation_created_at",
    "last_message_at",
    "message_id",
    "message_role",
    "message_content",
    "message_model",
    "tokens_prompt",
    "tokens_completion",
    "latency_ms",
    "message_created_at",
  ];

  const rows: string[] = [headers.join(",")];

  for (const conversation of conversations) {
    const transformed = transformConversation(conversation);

    for (const message of transformed.messages) {
      const row = [
        escapeCSVField(transformed.conversationId),
        escapeCSVField(transformed.visitorId),
        escapeCSVField(transformed.agentName),
        escapeCSVField(transformed.agentModel),
        String(transformed.messageCount),
        escapeCSVField(transformed.sentiment ?? ""),
        escapeCSVField(transformed.topics.join("; ")),
        escapeCSVField(transformed.origin ?? ""),
        escapeCSVField(transformed.createdAt),
        escapeCSVField(transformed.lastMessageAt),
        escapeCSVField(message.messageId),
        escapeCSVField(message.role),
        escapeCSVField(message.content),
        escapeCSVField(message.model ?? ""),
        message.tokensPrompt !== undefined ? String(message.tokensPrompt) : "",
        message.tokensCompletion !== undefined
          ? String(message.tokensCompletion)
          : "",
        message.latencyMs !== undefined ? String(message.latencyMs) : "",
        escapeCSVField(message.createdAt),
      ];

      rows.push(row.join(","));
    }
  }

  return rows.join("\n");
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
