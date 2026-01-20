import { createRoot } from "react-dom/client";
import { Widget } from "./Widget";
import type { WidgetConfig, WidgetOptions } from "./types";

/**
 * Default widget configuration (used while loading actual config)
 */
const DEFAULT_CONFIG: WidgetConfig = {
  primaryColor: "#3b82f6",
  welcomeMessage: "Hello! How can I help you today?",
  placeholderText: "Type a message...",
  position: "bottom-right",
};

/**
 * Fetch agent widget configuration
 */
async function fetchWidgetConfig(
  apiUrl: string,
  agentId: string
): Promise<WidgetConfig> {
  try {
    const response = await fetch(`${apiUrl}/api/widget/${agentId}`);
    if (!response.ok) {
      console.warn(
        `[ChatWidget] Failed to fetch config (${response.status}), using defaults`
      );
      return DEFAULT_CONFIG;
    }
    const data = await response.json();
    return data.widgetConfig || DEFAULT_CONFIG;
  } catch (error) {
    console.warn("[ChatWidget] Failed to fetch config, using defaults:", error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Initialize the chat widget
 */
async function initWidget(options: WidgetOptions): Promise<void> {
  const { agentId, apiUrl = window.location.origin } = options;

  // Fetch widget configuration for styling the toggle button
  const config = await fetchWidgetConfig(apiUrl, agentId);

  // Create container element
  const container = document.createElement("div");
  container.id = "cb-widget-container";
  document.body.appendChild(container);

  // Mount React app
  const root = createRoot(container);
  root.render(<Widget agentId={agentId} apiUrl={apiUrl} config={config} />);
}

/**
 * Parse data attributes from script tag
 */
function parseScriptOptions(): WidgetOptions | null {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) {
    // Fallback: find script by src pattern
    const scripts = document.querySelectorAll("script[data-agent-id]");
    const widgetScript = scripts[scripts.length - 1] as HTMLScriptElement | null;
    if (!widgetScript) {
      console.error("[ChatWidget] Could not find widget script element");
      return null;
    }
    return parseOptionsFromElement(widgetScript);
  }
  return parseOptionsFromElement(script);
}

function parseOptionsFromElement(element: HTMLElement): WidgetOptions | null {
  const agentId = element.dataset.agentId;
  if (!agentId) {
    console.error("[ChatWidget] Missing data-agent-id attribute on script tag");
    return null;
  }

  return {
    agentId,
    apiUrl: element.dataset.apiUrl,
  };
}

/**
 * Auto-initialize when script loads
 */
function autoInit(): void {
  const options = parseScriptOptions();
  if (options) {
    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => initWidget(options));
    } else {
      initWidget(options);
    }
  }
}

// Auto-initialize
autoInit();

// Export for manual initialization if needed
(window as Window & { ChatWidget?: { init: typeof initWidget } }).ChatWidget = {
  init: initWidget,
};
