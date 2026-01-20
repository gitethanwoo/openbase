import { createRoot } from "react-dom/client";
import { Widget } from "./Widget";
import { WidgetAPI } from "./api";
import type { AgentData, WidgetOptions } from "./types";

/**
 * Initialize the chat widget
 */
async function initWidget(options: WidgetOptions): Promise<void> {
  const { agentId, apiUrl = window.location.origin } = options;

  // Create API client
  const api = new WidgetAPI(apiUrl, agentId);

  // Fetch agent configuration
  let agent: AgentData;
  try {
    agent = await api.fetchAgentConfig();
  } catch (error) {
    console.error("[ChatWidget] Failed to load agent configuration:", error);
    return;
  }

  // Create container element
  const container = document.createElement("div");
  container.id = "cb-widget-container";
  document.body.appendChild(container);

  // Mount React app
  const root = createRoot(container);
  root.render(<Widget agent={agent} api={api} />);
}

/**
 * Parse data attributes from script tag
 */
function parseScriptOptions(): WidgetOptions | null {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) {
    // Fallback: find script by src pattern
    const scripts = document.querySelectorAll('script[data-agent-id]');
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
