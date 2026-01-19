import { VectorSearchResult } from "./chunks";

/**
 * RAG prompt construction module.
 *
 * Builds prompts for LLM calls by combining:
 * - Agent's configured system prompt
 * - Retrieved context chunks with source citations
 * - Token limit management
 */

// ============================================================================
// Types
// ============================================================================

export interface AgentConfig {
  name: string;
  systemPrompt: string;
  model: string;
  temperature: number;
}

export interface FormattedChunk {
  content: string;
  sourceName: string;
  sourceType: string;
  url?: string;
  pageNumber?: number;
  chunkId: string;
  sourceId: string;
}

export interface RAGPromptResult {
  systemPrompt: string;
  contextSection: string;
  chunksUsed: FormattedChunk[];
  totalTokens: number;
  truncated: boolean;
}

// ============================================================================
// Token Counting (approximation)
// ============================================================================

/**
 * Approximate token count for text.
 * Uses ~4 characters per token heuristic for English text.
 */
function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ============================================================================
// Context Formatting
// ============================================================================

const CONTEXT_HEADER = `\n\n---\n\nYou have access to the following knowledge base excerpts. Use them to answer questions accurately. Always cite your sources when using information from the knowledge base.\n\n`;

const CONTEXT_FOOTER = `\n---\n\nWhen answering:\n- Use information from the knowledge base when relevant\n- Cite sources by name when referencing specific information\n- If the knowledge base doesn't contain relevant information, say so clearly\n- Do not make up information that isn't in the knowledge base or your general knowledge`;

/**
 * Format a single chunk for inclusion in the context section.
 */
function formatChunkForContext(chunk: VectorSearchResult, index: number): string {
  const { content, metadata } = chunk;
  const { sourceName, sourceType, pageNumber, url } = metadata;

  let citation = `[${index + 1}] Source: ${sourceName}`;
  if (sourceType) {
    citation += ` (${sourceType})`;
  }
  if (pageNumber !== undefined) {
    citation += ` - Page ${pageNumber}`;
  }
  if (url) {
    citation += ` - ${url}`;
  }

  return `${citation}\n${content}\n`;
}

/**
 * Convert VectorSearchResult to FormattedChunk for tracking which chunks were used.
 */
function toFormattedChunk(chunk: VectorSearchResult): FormattedChunk {
  return {
    content: chunk.content,
    sourceName: chunk.metadata.sourceName,
    sourceType: chunk.metadata.sourceType,
    url: chunk.metadata.url,
    pageNumber: chunk.metadata.pageNumber,
    chunkId: chunk._id.toString(),
    sourceId: chunk.sourceId.toString(),
  };
}

// ============================================================================
// Main RAG Prompt Builder
// ============================================================================

export interface BuildRAGPromptOptions {
  agentConfig: AgentConfig;
  chunks: VectorSearchResult[];
  maxContextTokens?: number;
}

/**
 * Build a RAG prompt from agent config and retrieved chunks.
 *
 * Combines the agent's system prompt with formatted context from retrieved
 * knowledge base chunks. Caps context at the specified token limit.
 *
 * @param options.agentConfig - Agent configuration with system prompt
 * @param options.chunks - Retrieved chunks from vector search (sorted by relevance)
 * @param options.maxContextTokens - Maximum tokens for context section (default: 4000)
 * @returns RAGPromptResult with system prompt, context, and metadata
 */
export function buildRAGPrompt(options: BuildRAGPromptOptions): RAGPromptResult {
  const { agentConfig, chunks, maxContextTokens = 4000 } = options;

  // Start with the agent's configured system prompt
  const baseSystemPrompt = agentConfig.systemPrompt.trim();

  // If no chunks, return just the system prompt
  if (chunks.length === 0) {
    return {
      systemPrompt: baseSystemPrompt,
      contextSection: "",
      chunksUsed: [],
      totalTokens: countTokens(baseSystemPrompt),
      truncated: false,
    };
  }

  // Calculate overhead tokens (header + footer)
  const overheadTokens = countTokens(CONTEXT_HEADER) + countTokens(CONTEXT_FOOTER);
  const availableContextTokens = maxContextTokens - overheadTokens;

  // Build context section, adding chunks until we hit the token limit
  const includedChunks: VectorSearchResult[] = [];
  const formattedChunks: string[] = [];
  let contextTokens = 0;
  let truncated = false;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const formattedChunk = formatChunkForContext(chunk, includedChunks.length);
    const chunkTokens = countTokens(formattedChunk);

    // Check if adding this chunk would exceed the limit
    if (contextTokens + chunkTokens > availableContextTokens) {
      truncated = true;
      break;
    }

    includedChunks.push(chunk);
    formattedChunks.push(formattedChunk);
    contextTokens += chunkTokens;
  }

  // Build the full context section
  const contextSection =
    includedChunks.length > 0
      ? CONTEXT_HEADER + formattedChunks.join("\n") + CONTEXT_FOOTER
      : "";

  // Combine into final system prompt
  const systemPrompt = baseSystemPrompt + contextSection;

  return {
    systemPrompt,
    contextSection,
    chunksUsed: includedChunks.map(toFormattedChunk),
    totalTokens: countTokens(systemPrompt),
    truncated,
  };
}

// ============================================================================
// Message Formatting Helpers
// ============================================================================

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface BuildMessagesOptions {
  ragPrompt: RAGPromptResult;
  userMessage: string;
  conversationHistory?: ConversationMessage[];
  maxHistoryTokens?: number;
}

export interface MessagesResult {
  messages: ConversationMessage[];
  totalTokens: number;
  historyTruncated: boolean;
}

/**
 * Build the full messages array for an LLM call.
 *
 * Combines the RAG system prompt with conversation history and the user's message.
 * Truncates history if it exceeds the token limit, keeping the most recent messages.
 *
 * @param options.ragPrompt - Result from buildRAGPrompt
 * @param options.userMessage - The current user message
 * @param options.conversationHistory - Previous messages in the conversation
 * @param options.maxHistoryTokens - Maximum tokens for conversation history (default: 2000)
 */
export function buildMessages(options: BuildMessagesOptions): MessagesResult {
  const {
    ragPrompt,
    userMessage,
    conversationHistory = [],
    maxHistoryTokens = 2000,
  } = options;

  const messages: ConversationMessage[] = [];
  let totalTokens = ragPrompt.totalTokens;
  let historyTruncated = false;

  // Add system message
  messages.push({
    role: "system",
    content: ragPrompt.systemPrompt,
  });

  // Add conversation history (truncated from the start if needed)
  if (conversationHistory.length > 0) {
    let historyTokens = 0;
    const includedHistory: ConversationMessage[] = [];

    // Work backwards from most recent to include as many messages as possible
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const message = conversationHistory[i];
      const messageTokens = countTokens(message.content);

      if (historyTokens + messageTokens > maxHistoryTokens) {
        historyTruncated = true;
        break;
      }

      includedHistory.unshift(message);
      historyTokens += messageTokens;
    }

    messages.push(...includedHistory);
    totalTokens += historyTokens;
  }

  // Add current user message
  const userTokens = countTokens(userMessage);
  messages.push({
    role: "user",
    content: userMessage,
  });
  totalTokens += userTokens;

  return {
    messages,
    totalTokens,
    historyTruncated,
  };
}

// ============================================================================
// Citation Extraction
// ============================================================================

export interface Citation {
  chunkId: string;
  sourceId: string;
  sourceName: string;
  sourceType: string;
  url?: string;
  pageNumber?: number;
}

/**
 * Extract citation metadata from the chunks used in a RAG prompt.
 * Returns deduplicated citations by source.
 */
export function extractCitations(chunksUsed: FormattedChunk[]): Citation[] {
  // Deduplicate by sourceId
  const seenSources = new Set<string>();
  const citations: Citation[] = [];

  for (const chunk of chunksUsed) {
    if (!seenSources.has(chunk.sourceId)) {
      seenSources.add(chunk.sourceId);
      citations.push({
        chunkId: chunk.chunkId,
        sourceId: chunk.sourceId,
        sourceName: chunk.sourceName,
        sourceType: chunk.sourceType,
        url: chunk.url,
        pageNumber: chunk.pageNumber,
      });
    }
  }

  return citations;
}
