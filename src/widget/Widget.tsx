import { useState, useRef, useEffect, useCallback } from "react";
import type { AgentData, Message, WidgetConfig } from "./types";
import { WidgetAPI } from "./api";

interface WidgetProps {
  agent: AgentData;
  api: WidgetAPI;
}

/**
 * Get position styles based on widget config
 */
function getPositionStyles(
  position: WidgetConfig["position"]
): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "fixed",
    zIndex: 2147483647,
  };

  switch (position) {
    case "bottom-left":
      return { ...base, bottom: "20px", left: "20px" };
    case "top-right":
      return { ...base, top: "20px", right: "20px" };
    case "top-left":
      return { ...base, top: "20px", left: "20px" };
    case "bottom-right":
    default:
      return { ...base, bottom: "20px", right: "20px" };
  }
}

/**
 * Generate unique IDs for messages
 */
function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Chat Widget Component
 * Self-contained with inline styles to avoid conflicts with host page
 */
export function Widget({ agent, api }: WidgetProps) {
  const { widgetConfig } = agent;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedInput = input.trim();
      if (!trimmedInput || isLoading) return;

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
        await api.sendMessage(
          trimmedInput,
          [...newMessages, { id: assistantMessage.id, role: "user", content: trimmedInput }],
          (text) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id
                  ? { ...m, content: text }
                  : m
              )
            );
          },
          agent
        );

        // Mark streaming as complete
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, isStreaming: false }
              : m
          )
        );
      } catch (error) {
        console.error("Failed to send message:", error);
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
    [input, isLoading, messages, api, agent]
  );

  const positionStyles = getPositionStyles(widgetConfig.position);

  // Base styles to reset any host page styles
  const resetStyles: React.CSSProperties = {
    all: "initial",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: "14px",
    lineHeight: "1.5",
    color: "#1f2937",
    boxSizing: "border-box",
  };

  return (
    <div style={{ ...resetStyles, ...positionStyles }}>
      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            ...resetStyles,
            position: "absolute",
            bottom: "70px",
            right: "0",
            width: "380px",
            maxWidth: "calc(100vw - 40px)",
            height: "520px",
            maxHeight: "calc(100vh - 120px)",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            boxShadow:
              "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              ...resetStyles,
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
                  ...resetStyles,
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#ffffff",
                }}
              >
                {agent.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "600", fontSize: "16px" }}>
                {agent.name}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                ...resetStyles,
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
              ...resetStyles,
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
                  ...resetStyles,
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
                  ...resetStyles,
                  display: "flex",
                  justifyContent:
                    message.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    ...resetStyles,
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
              ...resetStyles,
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
                ...resetStyles,
                flex: 1,
                padding: "12px 16px",
                borderRadius: "24px",
                border: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb",
                fontSize: "14px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                ...resetStyles,
                width: "44px",
                height: "44px",
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
                    animation: "cb-widget-spin 1s linear infinite",
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
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...resetStyles,
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          backgroundColor: widgetConfig.primaryColor,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          transition: "transform 0.2s ease",
        }}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
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
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Keyframes for spinner animation */}
      <style>
        {`
          @keyframes cb-widget-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
