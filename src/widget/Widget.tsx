import { useState, useRef, useEffect, useCallback } from "react";
import type { WidgetConfig, IframeToParentMessage } from "./types";

interface WidgetProps {
  agentId: string;
  apiUrl: string;
  config: WidgetConfig;
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
 * Get iframe position styles based on widget config
 */
function getIframePositionStyles(
  position: WidgetConfig["position"]
): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "absolute",
    width: "380px",
    maxWidth: "calc(100vw - 40px)",
    height: "520px",
    maxHeight: "calc(100vh - 120px)",
  };

  // Position iframe above/below the toggle button based on config
  switch (position) {
    case "bottom-left":
      return { ...base, bottom: "70px", left: "0" };
    case "top-right":
      return { ...base, top: "70px", right: "0" };
    case "top-left":
      return { ...base, top: "70px", left: "0" };
    case "bottom-right":
    default:
      return { ...base, bottom: "70px", right: "0" };
  }
}

function isIframeMessage(msg: unknown): msg is IframeToParentMessage {
  if (typeof msg !== "object" || msg === null) return false;
  const m = msg as { type?: string };
  return (
    m.type === "widget:ready" ||
    m.type === "widget:close" ||
    m.type === "widget:resize"
  );
}

/**
 * Widget Host Component
 * Renders toggle button and iframe containing the chat UI
 * Communicates with iframe via postMessage
 */
export function Widget({ agentId, apiUrl, config }: WidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Build iframe URL
  const iframeUrl = `${apiUrl}/embed/${agentId}`;

  // Listen for messages from iframe
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Validate origin matches our API URL
      const expectedOrigin = new URL(apiUrl).origin;
      if (event.origin !== expectedOrigin) return;

      const data = event.data;
      if (!isIframeMessage(data)) return;

      switch (data.type) {
        case "widget:ready":
          setIsReady(true);
          // Send open message if already open when iframe becomes ready
          if (isOpen && iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              { type: "widget:open" },
              apiUrl
            );
          }
          break;
        case "widget:close":
          setIsOpen(false);
          break;
        case "widget:resize":
          // Could implement dynamic height adjustment here if needed
          break;
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [apiUrl, isOpen]);

  // Notify iframe when open state changes
  useEffect(() => {
    if (!isReady || !iframeRef.current?.contentWindow) return;

    const message = isOpen ? { type: "widget:open" } : { type: "widget:close" };
    iframeRef.current.contentWindow.postMessage(message, apiUrl);
  }, [isOpen, isReady, apiUrl]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const positionStyles = getPositionStyles(config.position);
  const iframePositionStyles = getIframePositionStyles(config.position);

  // Base styles to reset any host page styles
  const resetStyles: React.CSSProperties = {
    all: "initial",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    boxSizing: "border-box",
  };

  return (
    <div style={{ ...resetStyles, ...positionStyles }}>
      {/* Chat Window (iframe) */}
      {isOpen && (
        <div
          style={{
            ...resetStyles,
            ...iframePositionStyles,
            borderRadius: "16px",
            boxShadow:
              "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
            overflow: "hidden",
            backgroundColor: "#ffffff",
          }}
        >
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            title="Chat Widget"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
            }}
            allow="clipboard-write"
          />
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={toggleOpen}
        style={{
          ...resetStyles,
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          backgroundColor: config.primaryColor,
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
    </div>
  );
}
