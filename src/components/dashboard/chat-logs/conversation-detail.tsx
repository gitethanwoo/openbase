"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Bot,
  Clock,
  Globe,
  FileText,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";

interface ConversationDetailProps {
  conversationId: string;
  conversation: Doc<"conversations">;
  agentName: string;
}

interface Citation {
  chunkId: Id<"chunks">;
  sourceId: Id<"sources">;
  sourceName: string;
  sourceType: string;
  contentSnippet: string;
  url?: string;
  pageNumber?: number;
}

export function ConversationDetail({
  conversationId,
  conversation,
  agentName,
}: ConversationDetailProps) {
  const messages = useQuery(api.chat.getMessages, {
    conversationId: conversationId as Id<"conversations">,
  });

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/chat-logs">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Chat Logs
          </Button>
        </Link>
      </div>

      {/* Conversation metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Conversation with {agentName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Visitor ID</div>
              <div className="font-medium truncate">
                {conversation.visitorId}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Messages</div>
              <div className="font-medium">{conversation.messageCount}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Started</div>
              <div
                className="font-medium"
                title={formatDateTime(new Date(conversation.createdAt))}
              >
                {formatRelativeTime(new Date(conversation.createdAt))}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Last Activity</div>
              <div
                className="font-medium"
                title={formatDateTime(new Date(conversation.lastMessageAt))}
              >
                {formatRelativeTime(new Date(conversation.lastMessageAt))}
              </div>
            </div>
          </div>

          {/* Origin and topics */}
          {(conversation.origin || conversation.topics.length > 0) && (
            <div className="mt-4 pt-4 border-t space-y-2">
              {conversation.origin && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <span className="truncate">{conversation.origin}</span>
                </div>
              )}
              {conversation.topics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {conversation.topics.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-1 text-xs font-medium"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message thread */}
      <Card>
        <CardHeader>
          <CardTitle>Conversation Thread</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!messages ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No messages in this conversation.
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message._id} message={message} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface MessageBubbleProps {
  message: Doc<"messages">;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-muted" : "bg-primary/10"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>

      {/* Message content */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {isUser ? "Visitor" : "Assistant"}
          </span>
          <span
            className="text-xs text-muted-foreground"
            title={formatDateTime(new Date(message.createdAt))}
          >
            {formatRelativeTime(new Date(message.createdAt))}
          </span>
        </div>

        <div
          className={`rounded-lg px-4 py-3 ${
            isUser ? "bg-muted" : "bg-primary/5 border border-primary/10"
          }`}
        >
          <div className="whitespace-pre-wrap text-sm">{message.content}</div>
        </div>

        {/* Citations for assistant messages */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <CitationsSection citations={message.citations} />
        )}

        {/* Token/latency info for assistant messages (optional debug info) */}
        {!isUser && (message.tokensPrompt || message.latencyMs) && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {message.model && <span>Model: {message.model}</span>}
            {message.tokensPrompt && message.tokensCompletion && (
              <span>
                Tokens: {message.tokensPrompt} in / {message.tokensCompletion}{" "}
                out
              </span>
            )}
            {message.latencyMs && <span>Latency: {message.latencyMs}ms</span>}
          </div>
        )}
      </div>
    </div>
  );
}

interface CitationsSectionProps {
  citations: Citation[];
}

function CitationsSection({ citations }: CitationsSectionProps) {
  // Group citations by source
  const uniqueSources = citations.reduce(
    (acc, citation) => {
      if (!acc.find((c) => c.sourceId === citation.sourceId)) {
        acc.push(citation);
      }
      return acc;
    },
    [] as Citation[]
  );

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <BookOpen className="h-3 w-3" />
        Sources ({uniqueSources.length})
      </div>
      <div className="grid gap-2">
        {uniqueSources.map((citation, index) => (
          <div
            key={`${citation.sourceId}-${index}`}
            className="flex items-start gap-2 rounded-md bg-muted/50 p-2 text-xs"
          >
            <SourceTypeIcon type={citation.sourceType} />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{citation.sourceName}</div>
              {citation.contentSnippet && (
                <div className="text-muted-foreground line-clamp-2 mt-1">
                  {citation.contentSnippet}
                </div>
              )}
              {citation.url && (
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline mt-1"
                >
                  View source
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {citation.pageNumber && (
                <span className="text-muted-foreground ml-2">
                  Page {citation.pageNumber}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SourceTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "website":
      return <Globe className="h-4 w-4 text-muted-foreground shrink-0" />;
    case "file":
      return <FileText className="h-4 w-4 text-muted-foreground shrink-0" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}
