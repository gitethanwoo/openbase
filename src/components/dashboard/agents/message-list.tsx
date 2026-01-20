"use client";

import { useRef, useEffect } from "react";
import { Bot, User, AlertTriangle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Id } from "../../../../convex/_generated/dataModel";

interface Message {
  _id: string;
  role: "user" | "assistant";
  content: string;
  streamId?: string;
  citations?: Array<{
    chunkId: Id<"chunks">;
    sourceId: Id<"sources">;
    sourceName: string;
    sourceType: string;
    contentSnippet: string;
    url?: string;
    pageNumber?: number;
  }>;
  judgeEvaluation?: {
    passed: boolean;
    safetyScore: number;
    groundednessScore: number;
    brandAlignmentScore: number;
    reasoning: string;
    flagged: boolean;
    originalContent?: string;
  };
  isStreaming?: boolean;
}

interface MessageListProps {
  messages: Message[];
  onSelectMessage: (message: Message | null) => void;
  selectedMessageId?: string;
  agentName: string;
}

export function MessageList({
  messages,
  onSelectMessage,
  selectedMessageId,
  agentName,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Test {agentName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Send a message to start testing your agent.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={cn(
              "group flex gap-3",
              message.role === "user" && "flex-row-reverse"
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {message.role === "user" ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>

            {/* Message bubble */}
            <div
              className={cn(
                "flex max-w-[80%] flex-col gap-1 rounded-lg px-4 py-2",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted",
                message.role === "assistant" &&
                  selectedMessageId === message._id &&
                  "ring-2 ring-primary"
              )}
            >
              <div className="whitespace-pre-wrap text-sm">
                {message.content || (
                  <span className="animate-pulse text-muted-foreground">
                    Thinking...
                  </span>
                )}
                {message.isStreaming && message.content && (
                  <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-current" />
                )}
              </div>

              {/* Message metadata for assistant messages */}
              {message.role === "assistant" && !message.isStreaming && (
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {/* Citations indicator */}
                  {message.citations && message.citations.length > 0 && (
                    <button
                      onClick={() => onSelectMessage(message)}
                      className={cn(
                        "flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-background/50",
                        selectedMessageId === message._id && "bg-background/50"
                      )}
                    >
                      <FileText className="h-3 w-3" />
                      <span>{message.citations.length} sources</span>
                    </button>
                  )}

                  {/* Judge evaluation indicator */}
                  {message.judgeEvaluation && (
                    <button
                      onClick={() => onSelectMessage(message)}
                      className={cn(
                        "flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-background/50",
                        !message.judgeEvaluation.passed &&
                          "text-amber-600 dark:text-amber-500"
                      )}
                    >
                      {message.judgeEvaluation.flagged ? (
                        <>
                          <AlertTriangle className="h-3 w-3" />
                          <span>Modified by safety filter</span>
                        </>
                      ) : (
                        <span>
                          Safety: {Math.round(message.judgeEvaluation.safetyScore * 100)}%
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
