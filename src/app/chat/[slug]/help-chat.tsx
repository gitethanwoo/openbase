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
  slug: string;
  organizationId: string;
  widgetConfig: WidgetConfig;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface HelpChatProps {
  slug: string;
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
 * Full-page chat UI for standalone help page at /chat/[slug]
 * Mobile-responsive design with agent branding
 */
export function HelpChat({ slug }: HelpChatProps) {
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const visitorIdRef = useRef<string>("");

  // Initialize visitor ID once we have the agent
  useEffect(() => {
    if (agent) {
      visitorIdRef.current = getOrCreateVisitorId(agent.id);
    }
  }, [agent]);

  // Fetch agent configuration by slug
  useEffect(() => {
    async function fetchAgent() {
      try {
        const response = await fetch(`/api/chat-page/${slug}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("This chat assistant could not be found.");
          } else {
            throw new Error(`Failed to fetch agent: ${response.status}`);
          }
          return;
        }
        const data: AgentData = await response.json();
        setAgent(data);
      } catch (err) {
        console.error("[HelpChat] Failed to load agent:", err);
        setError("Failed to load chat. Please try again later.");
      }
    }

    fetchAgent();
  }, [slug]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      adjustTextareaHeight();
    },
    [adjustTextareaHeight]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input, isLoading, messages, agent, conversationId]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedInput = input.trim();
      if (!trimmedInput || isLoading || !agent) return;

      setInput("");
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
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
            messages: [
              ...newMessages,
              { role: "user", content: trimmedInput },
            ].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            organizationId: agent.organizationId,
            agentId: agent.id,
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
        console.error("[HelpChat] Failed to send message:", err);
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
    [input, isLoading, messages, agent, conversationId]
  );

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: "#f9fafb",
        }}
      >
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "48px",
            borderRadius: "16px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            textAlign: "center",
            maxWidth: "400px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              fontSize: "32px",
            }}
          >
            😕
          </div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: "600",
              color: "#1f2937",
              marginBottom: "12px",
            }}
          >
            Oops!
          </h1>
          <p style={{ color: "#6b7280", fontSize: "14px", lineHeight: "1.6" }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: "#f9fafb",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
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
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontSize: "16px",
        lineHeight: "1.5",
        color: "#1f2937",
        backgroundColor: "#f9fafb",
      }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: widgetConfig.primaryColor,
          color: "#ffffff",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        {widgetConfig.avatarUrl ? (
          <img
            src={widgetConfig.avatarUrl}
            alt={agent.name}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid rgba(255, 255, 255, 0.3)",
            }}
          />
        ) : (
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              fontWeight: "600",
              border: "2px solid rgba(255, 255, 255, 0.3)",
            }}
          >
            {agent.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1
            style={{
              fontWeight: "600",
              fontSize: "20px",
              margin: 0,
            }}
          >
            {agent.name}
          </h1>
          <p
            style={{
              fontSize: "14px",
              opacity: 0.9,
              margin: 0,
            }}
          >
            Ask me anything
          </p>
        </div>
      </header>

      {/* Chat Container */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          maxWidth: "800px",
          width: "100%",
          margin: "0 auto",
          padding: "0",
        }}
      >
        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Welcome message */}
          {messages.length === 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: "16px 20px",
                  borderRadius: "20px",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                {widgetConfig.welcomeMessage}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: "flex",
                justifyContent:
                  message.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: "16px 20px",
                  borderRadius: "20px",
                  backgroundColor:
                    message.role === "user"
                      ? widgetConfig.primaryColor
                      : "#ffffff",
                  color: message.role === "user" ? "#ffffff" : "#1f2937",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
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
            padding: "16px 24px 24px",
            backgroundColor: "#ffffff",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            gap: "12px",
            alignItems: "flex-end",
            position: "sticky",
            bottom: 0,
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={widgetConfig.placeholderText}
            disabled={isLoading}
            rows={1}
            style={{
              flex: 1,
              padding: "14px 18px",
              borderRadius: "24px",
              border: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb",
              fontSize: "16px",
              outline: "none",
              fontFamily: "inherit",
              resize: "none",
              maxHeight: "120px",
              lineHeight: "1.5",
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              backgroundColor:
                isLoading || !input.trim()
                  ? "#d1d5db"
                  : widgetConfig.primaryColor,
              border: "none",
              cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              flexShrink: 0,
              transition: "background-color 0.2s",
            }}
            aria-label="Send message"
          >
            {isLoading ? (
              <span
                style={{
                  width: "24px",
                  height: "24px",
                  border: "2px solid #ffffff",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 1s linear infinite",
                }}
              />
            ) : (
              <svg
                width="24"
                height="24"
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
      </main>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Mobile-first responsive styles */
        @media (max-width: 640px) {
          header {
            padding: 12px 16px !important;
          }

          header h1 {
            font-size: 18px !important;
          }

          header img, header div:first-of-type {
            width: 40px !important;
            height: 40px !important;
          }

          main > div:first-child {
            padding: 16px !important;
          }

          form {
            padding: 12px 16px 16px !important;
          }

          textarea {
            font-size: 16px !important; /* Prevents zoom on iOS */
          }
        }
      `}</style>
    </div>
  );
}
