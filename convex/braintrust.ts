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
 */

import { initLogger, type Logger } from "braintrust";

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
// Logger Instance
// ============================================================================

let loggerInstance: Logger<true> | null = null;

/**
 * Get or create the Braintrust logger instance.
 * Returns null if BRAINTRUST_API_KEY is not set.
 */
function getLogger(): Logger<true> | null {
  if (loggerInstance) {
    return loggerInstance;
  }

  const apiKey = process.env.BRAINTRUST_API_KEY;
  if (!apiKey) {
    // Braintrust logging disabled - no API key configured
    return null;
  }

  loggerInstance = initLogger({
    projectName: "claudebase",
    apiKey,
  });

  return loggerInstance;
}

// ============================================================================
// Logging Functions
// ============================================================================

/**
 * Log an LLM call to Braintrust.
 *
 * This function is non-blocking and will not throw errors if logging fails,
 * to avoid impacting the main chat flow.
 */
export function logLLMCall(params: LogLLMCallParams): void {
  const logger = getLogger();
  if (!logger) {
    return;
  }

  const { input, output, metrics, tags } = params;

  // Build the input object for Braintrust
  const braintrustInput: Record<string, unknown> = {
    messages: input.messages,
  };
  if (input.systemPrompt) {
    braintrustInput.systemPrompt = input.systemPrompt;
  }
  if (input.userMessage) {
    braintrustInput.userMessage = input.userMessage;
  }
  if (input.context) {
    braintrustInput.context = input.context;
  }

  // Build tags array
  const tagsList: string[] = [tags.spanType];
  if (tags.organizationId) {
    tagsList.push(`org:${tags.organizationId}`);
  }
  if (tags.agentId) {
    tagsList.push(`agent:${tags.agentId}`);
  }
  if (tags.conversationId) {
    tagsList.push(`conv:${tags.conversationId}`);
  }

  // Log to Braintrust
  logger.log({
    input: braintrustInput,
    output: {
      content: output.content,
      finishReason: output.finishReason,
    },
    metadata: {
      model: metrics.model,
      organizationId: tags.organizationId,
      agentId: tags.agentId,
      conversationId: tags.conversationId,
      messageId: tags.messageId,
      spanType: tags.spanType,
    },
    metrics: {
      latency_ms: metrics.latencyMs,
      tokens_prompt: metrics.tokensPrompt,
      tokens_completion: metrics.tokensCompletion,
      tokens_total:
        metrics.tokensPrompt && metrics.tokensCompletion
          ? metrics.tokensPrompt + metrics.tokensCompletion
          : undefined,
    },
    tags: tagsList,
  });
}

/**
 * Log a chat completion call to Braintrust.
 */
export function logChatCompletion(params: {
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
  logLLMCall({
    input: {
      messages: params.messages,
      context: params.context,
    },
    output: {
      content: params.output,
      finishReason: params.finishReason,
    },
    metrics: {
      latencyMs: params.latencyMs,
      tokensPrompt: params.tokensPrompt,
      tokensCompletion: params.tokensCompletion,
      model: params.model,
    },
    tags: {
      organizationId: params.organizationId,
      agentId: params.agentId,
      conversationId: params.conversationId,
      messageId: params.messageId,
      spanType: "chat",
    },
  });
}

/**
 * Log a judge evaluation call to Braintrust.
 */
export function logJudgeEvaluation(params: {
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
  logLLMCall({
    input: {
      messages: params.messages,
    },
    output: {
      content: params.output,
    },
    metrics: {
      latencyMs: params.latencyMs,
      tokensPrompt: params.tokensPrompt,
      tokensCompletion: params.tokensCompletion,
      model: params.model,
    },
    tags: {
      organizationId: params.organizationId,
      agentId: params.agentId,
      conversationId: params.conversationId,
      messageId: params.messageId,
      spanType: "judge",
    },
  });
}
