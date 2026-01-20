"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface WidgetConfig {
  primaryColor: string;
  avatarUrl?: string;
  welcomeMessage: string;
  placeholderText: string;
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

interface AgentData {
  id: string;
  name: string;
  organizationId: string;
  widgetConfig: WidgetConfig;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface EmbedChatProps {
  agentId: string;
}

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getOrCreateVisitorId(agentId: string): string {
  const key = `cb_visitor_${agentId}`;
  let visitorId =
    typeof window !== "undefined" ? localStorage.getItem(key) : null;
  if (!visitorId) {
    visitorId = `visitor-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    if (typeof window !== "undefined") {
      localStorage.setItem(key, visitorId);
    }
  }
  return visitorId;
}

/**
 * Chat UI component rendered inside the iframe
 * Communicates with parent window via postMessage
 */
export function EmbedChat({ agentId }: EmbedChatProps) {
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const visitorIdRef = useRef<string>("");

  // Initialize visitor ID
  useEffect(() => {
    visitorIdRef.current = getOrCreateVisitorId(agentId);
  }, [agentId]);

  // Fetch agent configuration
  useEffect(() => {
    async function fetchAgent() {
      try {
        const response = await fetch(`/api/widget/${agentId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch agent: ${response.status}`);
        }
        const data: AgentData = await response.json();
        setAgent(data);

        // Notify parent that iframe is ready
        window.parent.postMessage({ type: "widget:ready" }, "*");
      } catch (err) {
        console.error("[EmbedChat] Failed to load agent:", err);
        setError("Failed to load chat widget");
      }
    }

    fetchAgent();
  }, [agentId]);

  // Listen for messages from parent window
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const data = event.data;
      if (typeof data !== "object" || data === null) return;

      switch (data.type) {
        case "widget:open":
          // Focus input when opened
          inputRef.current?.focus();
          break;
        case "widget:close":
          // Could clear state here if needed
          break;
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message to parent to request close
  const requestClose = useCallback(() => {
    window.parent.postMessage({ type: "widget:close" }, "*");
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedInput = input.trim();
      if (!trimmedInput || isLoading || !agent) return;

      setInput("");
      setIsLoading(true);

      // Add user message
      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: trimmedInput,
      };

      // Add placeholder assistant message
      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      const newMessages = [...messages, userMessage];
      setMessages([...newMessages, assistantMessage]);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...newMessages, { role: "user", content: trimmedInput }].map(
              (m) => ({
                role: m.role,
                content: m.content,
              })
            ),
            organizationId: agent.organizationId,
            agentId: agentId,
            visitorId: visitorIdRef.current,
            conversationId: conversationId,
            skipJudge: false,
          }),
        });

        if (!response.ok) {
          throw new Error(`Chat request failed: ${response.status}`);
        }

        // Update conversation ID from response headers
        const newConversationId = response.headers.get("X-Conversation-Id");
        if (newConversationId) {
          setConversationId(newConversationId);
        }

        // Stream the response
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id ? { ...m, content: fullText } : m
            )
          );
        }

        // Mark streaming as complete
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id ? { ...m, isStreaming: false } : m
          )
        );
      } catch (err) {
        console.error("[EmbedChat] Failed to send message:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? {
                  ...m,
                  content: "Sorry, something went wrong. Please try again.",
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, agent, agentId, conversationId]
  );

  if (error) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ef4444",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {error}
      </div>
    );
  }

  if (!agent) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            border: "3px solid #e5e7eb",
            borderTopColor: "#3b82f6",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const { widgetConfig } = agent;

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontSize: "14px",
        lineHeight: "1.5",
        color: "#1f2937",
        backgroundColor: "#ffffff",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: widgetConfig.primaryColor,
          color: "#ffffff",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        {widgetConfig.avatarUrl ? (
          <img
            src={widgetConfig.avatarUrl}
            alt={agent.name}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: "600",
            }}
          >
            {agent.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: "600", fontSize: "16px" }}>{agent.name}</div>
        </div>
        <button
          onClick={requestClose}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: "20px",
          }}
          aria-label="Close chat"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          backgroundColor: "#f9fafb",
        }}
      >
        {/* Welcome message */}
        {messages.length === 0 && (
          <div
            style={{
              maxWidth: "80%",
              padding: "12px 16px",
              borderRadius: "16px",
              backgroundColor: "#ffffff",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            }}
          >
            {widgetConfig.welcomeMessage}
          </div>
        )}

        {/* Message list */}
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: "flex",
              justifyContent: message.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                padding: "12px 16px",
                borderRadius: "16px",
                backgroundColor:
                  message.role === "user"
                    ? widgetConfig.primaryColor
                    : "#ffffff",
                color: message.role === "user" ? "#ffffff" : "#1f2937",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {message.content || (message.isStreaming && "...")}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: "16px",
          borderTop: "1px solid #e5e7eb",
          backgroundColor: "#ffffff",
          display: "flex",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={widgetConfig.placeholderText}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: "24px",
            border: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb",
            fontSize: "14px",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            backgroundColor:
              isLoading || !input.trim() ? "#d1d5db" : widgetConfig.primaryColor,
            border: "none",
            cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            flexShrink: 0,
          }}
          aria-label="Send message"
        >
          {isLoading ? (
            <span
              style={{
                width: "20px",
                height: "20px",
                border: "2px solid #ffffff",
                borderTopColor: "transparent",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 1s linear infinite",
              }}
            />
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </form>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
