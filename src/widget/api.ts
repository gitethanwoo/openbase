import type { AgentData, Message } from "./types";

/**
 * Widget API client for communicating with the backend
 */
export class WidgetAPI {
  private baseUrl: string;
  private agentId: string;
  private conversationId: string | null = null;
  private visitorId: string;

  constructor(baseUrl: string, agentId: string) {
    this.baseUrl = baseUrl;
    this.agentId = agentId;
    this.visitorId = this.getOrCreateVisitorId();
  }

  private getOrCreateVisitorId(): string {
    const key = `cb_visitor_${this.agentId}`;
    let visitorId = localStorage.getItem(key);
    if (!visitorId) {
      visitorId = `visitor-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem(key, visitorId);
    }
    return visitorId;
  }

  /**
   * Fetch agent configuration for the widget
   */
  async fetchAgentConfig(): Promise<AgentData> {
    const response = await fetch(`${this.baseUrl}/api/widget/${this.agentId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch agent config: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Send a message and stream the response
   */
  async sendMessage(
    userMessage: string,
    messages: Message[],
    onChunk: (text: string) => void,
    agent: AgentData
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        organizationId: agent.organizationId,
        agentId: this.agentId,
        visitorId: this.visitorId,
        conversationId: this.conversationId,
        skipJudge: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.status}`);
    }

    // Update conversation ID from response headers
    const newConversationId = response.headers.get("X-Conversation-Id");
    if (newConversationId) {
      this.conversationId = newConversationId;
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
      onChunk(fullText);
    }

    return fullText;
  }

  /**
   * Reset the conversation
   */
  resetConversation(): void {
    this.conversationId = null;
  }
}
