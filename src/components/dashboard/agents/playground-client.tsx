"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Bot, Send, ArrowLeft, Loader2, Code } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageList } from "./message-list";
import { SourcesPanel } from "./sources-panel";

interface PlaygroundClientProps {
  agent: Doc<"agents">;
  organizationId: string;
}

type Message = {
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
};

export function PlaygroundClient({ agent, organizationId }: PlaygroundClientProps) {
  const [conversationId, setConversationId] = useState<Id<"conversations"> | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const createConversation = useMutation(api.chat.createConversation);
  const sendMessage = useMutation(api.chat.sendMessage);

  // Subscribe to stream body when we have an active stream
  const streamBody = useQuery(
    api.chat.getStreamBody,
    currentStreamId ? { streamId: currentStreamId } : "skip"
  );

  // Subscribe to messages when we have a conversation
  const dbMessages = useQuery(
    api.chat.getMessages,
    conversationId ? { conversationId } : "skip"
  );

  // Effect to update streaming message content as it streams
  useEffect(() => {
    if (streamBody && streamingMessageId) {
      const streamText = streamBody.text;
      setMessages((prev) =>
        prev.map((m) =>
          m._id === streamingMessageId
            ? { ...m, content: streamText, isStreaming: true }
            : m
        )
      );
    }
  }, [streamBody, streamingMessageId]);

  // Effect to sync messages from database after streaming completes
  useEffect(() => {
    if (dbMessages && !streamingMessageId && conversationId) {
      setMessages(
        dbMessages.map((m) => ({
          _id: m._id,
          role: m.role as "user" | "assistant",
          content: m.content,
          streamId: m.streamId,
          citations: m.citations,
          judgeEvaluation: m.judgeEvaluation,
          isStreaming: false,
        }))
      );
    }
  }, [dbMessages, streamingMessageId, conversationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    setIsLoading(true);
    setInput("");

    // Generate a temporary visitor ID for the playground
    const visitorId = `playground-${Date.now()}`;

    // Add user message to local state immediately
    const userMessageId = `user-${Date.now()}`;
    const userMessage: Message = {
      _id: userMessageId,
      role: "user",
      content: trimmedInput,
    };

    // Track messages added for error cleanup
    let addedAssistantMessageId: string | null = null;

    setMessages((prev) => [...prev, userMessage]);

    try {
      let result: { assistantMessageId: Id<"messages">; streamId: string; conversationId?: Id<"conversations"> };

      if (!conversationId) {
        // Create new conversation
        const createResult = await createConversation({
          organizationId: organizationId as Id<"organizations">,
          agentId: agent._id,
          visitorId,
          userMessage: trimmedInput,
          origin: "playground",
        });
        setConversationId(createResult.conversationId);
        result = { ...createResult, conversationId: createResult.conversationId };
      } else {
        // Send message to existing conversation
        const sendResult = await sendMessage({
          conversationId,
          userMessage: trimmedInput,
        });
        result = sendResult;
      }

      // Add placeholder for assistant message
      addedAssistantMessageId = result.assistantMessageId;
      const assistantMessage: Message = {
        _id: result.assistantMessageId,
        role: "assistant",
        content: "",
        streamId: result.streamId,
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingMessageId(result.assistantMessageId);
      setCurrentStreamId(result.streamId);

      // Trigger the streaming endpoint
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (!convexUrl) {
        throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
      }
      const httpUrl = convexUrl.replace(".cloud", ".site");
      console.log("Calling stream endpoint:", httpUrl + "/chat-stream");

      const streamResponse = await fetch(`${httpUrl}/chat-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          streamId: result.streamId,
          conversationId: result.conversationId ?? conversationId,
          messageId: result.assistantMessageId,
          userMessage: trimmedInput,
        }),
      });

      if (!streamResponse.ok) {
        const errorText = await streamResponse.text();
        console.error("Stream error:", streamResponse.status, errorText);
        throw new Error(`Stream failed: ${streamResponse.status}`);
      }

      // Stream completed, clear streaming state
      setStreamingMessageId(null);
      setCurrentStreamId(null);

      // Refresh messages from database to get final content with citations
      // Small delay to allow database to update
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === result.assistantMessageId ? { ...m, isStreaming: false } : m
          )
        );
      }, 500);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Remove the placeholder messages on error
      setMessages((prev) => prev.filter((m) =>
        m._id !== userMessageId && m._id !== addedAssistantMessageId
      ));
      // Clear streaming state
      setStreamingMessageId(null);
      setCurrentStreamId(null);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setSelectedMessage(null);
    setStreamingMessageId(null);
    setCurrentStreamId(null);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/agents">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{agent.name}</h2>
              <p className="text-sm text-muted-foreground">Playground</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/agents/${agent._id}/edit`}>
            <Button variant="outline" size="sm">
              Edit Agent
            </Button>
          </Link>
          <Link href={`/dashboard/agents/${agent._id}/embed`}>
            <Button variant="outline" size="sm">
              <Code className="mr-1.5 h-3.5 w-3.5" />
              Embed
            </Button>
          </Link>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleNewChat}>
              New Chat
            </Button>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Chat area */}
        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardHeader className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Test Chat</CardTitle>
                <CardDescription className="text-xs">
                  Model: {agent.model} | Temperature: {agent.temperature}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
            {/* Messages */}
            <MessageList
              messages={messages}
              onSelectMessage={setSelectedMessage}
              selectedMessageId={selectedMessage?._id}
              agentName={agent.name}
            />

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="flex gap-2 border-t bg-muted/30 p-4"
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message to test your agent..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sources panel */}
        <SourcesPanel message={selectedMessage} />
      </div>
    </div>
  );
}
