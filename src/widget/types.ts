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
