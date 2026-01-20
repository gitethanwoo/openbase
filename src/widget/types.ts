/**
 * Widget configuration from agent settings
 */
export interface WidgetConfig {
  primaryColor: string;
  avatarUrl?: string;
  welcomeMessage: string;
  placeholderText: string;
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

/**
 * Agent data for widget initialization
 */
export interface AgentData {
  id: string;
  name: string;
  organizationId: string;
  widgetConfig: WidgetConfig;
}

/**
 * Chat message structure
 */
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

/**
 * Widget initialization options from script data attributes
 */
export interface WidgetOptions {
  agentId: string;
  apiUrl?: string;
}

/**
 * PostMessage protocol types for iframe communication
 */

// Messages from parent (widget host) to iframe
export type ParentToIframeMessage =
  | { type: "widget:open" }
  | { type: "widget:close" }
  | { type: "widget:config"; config: WidgetConfig };

// Messages from iframe to parent (widget host)
export type IframeToParentMessage =
  | { type: "widget:ready" }
  | { type: "widget:close" }
  | { type: "widget:resize"; height: number };

// Union type for all widget messages
export type WidgetMessage = ParentToIframeMessage | IframeToParentMessage;

// Type guard helpers
export function isParentMessage(
  msg: unknown
): msg is ParentToIframeMessage {
  if (typeof msg !== "object" || msg === null) return false;
  const m = msg as { type?: string };
  return (
    m.type === "widget:open" ||
    m.type === "widget:close" ||
    m.type === "widget:config"
  );
}

export function isIframeMessage(
  msg: unknown
): msg is IframeToParentMessage {
  if (typeof msg !== "object" || msg === null) return false;
  const m = msg as { type?: string };
  return (
    m.type === "widget:ready" ||
    m.type === "widget:close" ||
    m.type === "widget:resize"
  );
}
