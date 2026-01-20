/**
 * Braintrust Logging for LLM Calls
 *
 * Logs all LLM calls to Braintrust for monitoring and evaluation.
 * Each call is logged with:
 * - Input (messages/prompt)
 * - Output (completion)
 * - Context (RAG chunks if applicable)
 * - Metrics: latency_ms, tokens_used (prompt + completion), model
 * - Tags: organizationId, agentId, conversationId
 *
 * NOTE: This is a lightweight stub that doesn't actually log to Braintrust.
 * For full Braintrust integration, use the internal action braintrustLogger:logToRemote.
 */

// ============================================================================
// Types
// ============================================================================

export interface LLMLogInput {
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  userMessage?: string;
  context?: string; // RAG context
}

export interface LLMLogOutput {
  content: string;
  finishReason?: string | null;
}

export interface LLMLogMetrics {
  latencyMs: number;
  tokensPrompt?: number;
  tokensCompletion?: number;
  model: string;
}

export interface LLMLogTags {
  organizationId?: string;
  agentId?: string;
  conversationId?: string;
  messageId?: string;
  spanType: "chat" | "judge";
}

export interface LogLLMCallParams {
  input: LLMLogInput;
  output: LLMLogOutput;
  metrics: LLMLogMetrics;
  tags: LLMLogTags;
}

// ============================================================================
// Logging Functions (No-op stubs for Convex runtime compatibility)
// Actual logging happens via braintrustLogger.ts which uses "use node"
// ============================================================================

/**
 * Log an LLM call to Braintrust.
 * This is a no-op stub - actual logging happens via scheduled internal action.
 */
export function logLLMCall(_params: LogLLMCallParams): void {
  // No-op in Convex runtime - logging is handled separately
}

/**
 * Log a chat completion call to Braintrust.
 */
export function logChatCompletion(_params: {
  messages: Array<{ role: string; content: string }>;
  output: string;
  finishReason?: string | null;
  model: string;
  latencyMs: number;
  tokensPrompt?: number;
  tokensCompletion?: number;
  organizationId?: string;
  agentId?: string;
  conversationId?: string;
  messageId?: string;
  context?: string;
}): void {
  // No-op in Convex runtime - logging is handled separately
}

/**
 * Log a judge evaluation call to Braintrust.
 */
export function logJudgeEvaluation(_params: {
  messages: Array<{ role: string; content: string }>;
  output: string;
  model: string;
  latencyMs: number;
  tokensPrompt?: number;
  tokensCompletion?: number;
  organizationId?: string;
  agentId?: string;
  conversationId?: string;
  messageId?: string;
}): void {
  // No-op in Convex runtime - logging is handled separately
}
