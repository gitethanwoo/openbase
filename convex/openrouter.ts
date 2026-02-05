/**
 * OpenRouter API client for multi-model LLM support.
 *
 * Provides a unified interface to call various LLM models through OpenRouter:
 * - GPT-4o, GPT-4o-mini (OpenAI)
 * - Claude 3.5 Sonnet, Claude 3 Opus (Anthropic)
 * - Gemini Pro (Google)
 * - Llama, Mistral, and many more
 *
 * Features:
 * - Streaming and non-streaming completions
 * - Model and temperature from agent config
 * - Proper error handling with typed responses
 * - Token usage tracking
 */

// ============================================================================
// Types
// ============================================================================

export interface OpenRouterConfig {
  apiKey: string;
  siteUrl?: string;
  siteName?: string;
}

// ============================================================================
// Embedding Types
// ============================================================================

export interface EmbeddingRequest {
  model: string;
  input: string | string[];
  dimensions?: number;
}

export interface EmbeddingData {
  object: "embedding";
  embedding: number[];
  index: number;
}

export interface EmbeddingUsage {
  prompt_tokens: number;
  total_tokens: number;
}

export interface EmbeddingResponse {
  object: "list";
  data: EmbeddingData[];
  model: string;
  usage: EmbeddingUsage;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: EmbeddingUsage;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  model: string;
  usage: EmbeddingUsage;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  stop?: string | string[];
}

export interface ChatCompletionChoice {
  index: number;
  message: {
    role: string;
    content: string | null;
  };
  finish_reason: string | null;
}

export interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: ChatCompletionUsage;
  created: number;
}

export interface StreamingChoice {
  index: number;
  delta: {
    role?: string;
    content?: string | null;
  };
  finish_reason: string | null;
}

export interface StreamingChunk {
  id: string;
  model: string;
  choices: StreamingChoice[];
  usage?: ChatCompletionUsage;
}

export interface OpenRouterError {
  code: number;
  message: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Supported Models
// ============================================================================

/**
 * Popular models available through OpenRouter.
 * Use these model IDs in agent configuration.
 */
export const SUPPORTED_MODELS = {
  // OpenAI
  "openai/gpt-4o": {
    name: "GPT-4o",
    provider: "OpenAI",
    contextLength: 128000,
    supportsStreaming: true,
  },
  "openai/gpt-4o-mini": {
    name: "GPT-4o Mini",
    provider: "OpenAI",
    contextLength: 128000,
    supportsStreaming: true,
  },
  "openai/gpt-4-turbo": {
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    contextLength: 128000,
    supportsStreaming: true,
  },

  // Anthropic
  "anthropic/claude-3.5-sonnet": {
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    contextLength: 200000,
    supportsStreaming: true,
  },
  "anthropic/claude-3-opus": {
    name: "Claude 3 Opus",
    provider: "Anthropic",
    contextLength: 200000,
    supportsStreaming: true,
  },
  "anthropic/claude-3-haiku": {
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    contextLength: 200000,
    supportsStreaming: true,
  },

  // Google
  "google/gemini-pro-1.5": {
    name: "Gemini 1.5 Pro",
    provider: "Google",
    contextLength: 1000000,
    supportsStreaming: true,
  },
  "google/gemini-flash-1.5": {
    name: "Gemini 1.5 Flash",
    provider: "Google",
    contextLength: 1000000,
    supportsStreaming: true,
  },

  // Meta
  "meta-llama/llama-3.1-70b-instruct": {
    name: "Llama 3.1 70B",
    provider: "Meta",
    contextLength: 128000,
    supportsStreaming: true,
  },
  "meta-llama/llama-3.1-8b-instruct": {
    name: "Llama 3.1 8B",
    provider: "Meta",
    contextLength: 128000,
    supportsStreaming: true,
  },

  // Mistral
  "mistralai/mistral-large": {
    name: "Mistral Large",
    provider: "Mistral",
    contextLength: 128000,
    supportsStreaming: true,
  },
  "mistralai/mixtral-8x7b-instruct": {
    name: "Mixtral 8x7B",
    provider: "Mistral",
    contextLength: 32000,
    supportsStreaming: true,
  },

  // MoonshotAI
  "moonshotai/kimi-k2.5": {
    name: "Kimi K2.5",
    provider: "MoonshotAI",
    contextLength: 262144,
    supportsStreaming: true,
  },
  "qwen/qwen3-30b-a3b": {
    name: "Qwen 3 30B A3B",
    provider: "Qwen",
    contextLength: 40960,
    supportsStreaming: true,
  },
  "qwen/qwen3-235b-a22b-2507": {
    name: "Qwen 3 235B A22B 2507",
    provider: "Qwen",
    contextLength: 262144,
    supportsStreaming: true,
  },
} as const;

export type SupportedModel = keyof typeof SUPPORTED_MODELS;

/**
 * Supported embedding models available through OpenRouter.
 */
export const EMBEDDING_MODELS = {
  "openai/text-embedding-3-small": {
    name: "Text Embedding 3 Small",
    provider: "OpenAI",
    dimensions: 1536,
    maxTokens: 8192,
  },
  "openai/text-embedding-3-large": {
    name: "Text Embedding 3 Large",
    provider: "OpenAI",
    dimensions: 3072,
    maxTokens: 8192,
  },
} as const;

export type SupportedEmbeddingModel = keyof typeof EMBEDDING_MODELS;

/** Default embedding model for the platform */
export const DEFAULT_EMBEDDING_MODEL: SupportedEmbeddingModel =
  "openai/text-embedding-3-small";

/** Default embedding dimensions (text-embedding-3-small) */
export const DEFAULT_EMBEDDING_DIMENSIONS = 1536;

/**
 * Get model info by ID.
 */
export function getModelInfo(modelId: string) {
  return SUPPORTED_MODELS[modelId as SupportedModel];
}

/**
 * Get embedding model info by ID.
 */
export function getEmbeddingModelInfo(modelId: string) {
  return EMBEDDING_MODELS[modelId as SupportedEmbeddingModel];
}

/**
 * Check if a model ID is supported.
 */
export function isModelSupported(modelId: string): modelId is SupportedModel {
  return modelId in SUPPORTED_MODELS;
}

/**
 * Check if an embedding model ID is supported.
 */
export function isEmbeddingModelSupported(
  modelId: string
): modelId is SupportedEmbeddingModel {
  return modelId in EMBEDDING_MODELS;
}

// ============================================================================
// OpenRouter Client
// ============================================================================

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings";

/**
 * Create an OpenRouter client with the given configuration.
 */
export function createOpenRouterClient(config: OpenRouterConfig) {
  const { apiKey, siteUrl, siteName } = config;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  if (siteUrl) {
    headers["HTTP-Referer"] = siteUrl;
  }
  if (siteName) {
    headers["X-Title"] = siteName;
  }

  return {
    /**
     * Create a non-streaming chat completion.
     */
    async createCompletion(
      request: ChatCompletionRequest
    ): Promise<ChatCompletionResponse> {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens,
          stop: request.stop,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: { error?: OpenRouterError } | undefined;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Not JSON, use raw text
        }

        const errorMessage = errorData?.error?.message ?? errorText;
        throw new OpenRouterAPIError(
          `OpenRouter API error: ${response.status} - ${errorMessage}`,
          response.status,
          errorData?.error
        );
      }

      return response.json();
    },

    /**
     * Create a streaming chat completion.
     * Returns an async generator that yields content chunks.
     */
    async *createStreamingCompletion(
      request: ChatCompletionRequest
    ): AsyncGenerator<StreamingResult, void, unknown> {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens,
          stop: request.stop,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: { error?: OpenRouterError } | undefined;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Not JSON, use raw text
        }

        const errorMessage = errorData?.error?.message ?? errorText;
        throw new OpenRouterAPIError(
          `OpenRouter API error: ${response.status} - ${errorMessage}`,
          response.status,
          errorData?.error
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new OpenRouterAPIError("No response body", 500);
      }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmedLine = line.trim();

            // Skip empty lines and comments (OpenRouter sends `: OPENROUTER PROCESSING`)
            if (!trimmedLine || trimmedLine.startsWith(":")) {
              continue;
            }

            if (trimmedLine.startsWith("data: ")) {
              const data = trimmedLine.slice(6);

              if (data === "[DONE]") {
                return;
              }

              try {
                const parsed: StreamingChunk = JSON.parse(data);

                // Check for mid-stream errors
                if ("error" in parsed) {
                  const error = (parsed as unknown as { error: OpenRouterError })
                    .error;
                  throw new OpenRouterAPIError(
                    `Stream error: ${error.message}`,
                    error.code,
                    error
                  );
                }

                const content = parsed.choices?.[0]?.delta?.content;
                const finishReason = parsed.choices?.[0]?.finish_reason;
                const usage = parsed.usage;

                yield {
                  content: content ?? null,
                  finishReason,
                  usage,
                  model: parsed.model,
                };
              } catch (e) {
                if (e instanceof OpenRouterAPIError) {
                  throw e;
                }
                // Ignore JSON parse errors for malformed chunks
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },

    /**
     * Create embeddings for a single text input.
     * Uses text-embedding-3-small (1536 dimensions) by default.
     */
    async createEmbedding(
      text: string,
      model: string = DEFAULT_EMBEDDING_MODEL
    ): Promise<EmbeddingResult> {
      const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          input: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: { error?: OpenRouterError } | undefined;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Not JSON, use raw text
        }

        const errorMessage = errorData?.error?.message ?? errorText;
        throw new OpenRouterAPIError(
          `OpenRouter Embeddings API error: ${response.status} - ${errorMessage}`,
          response.status,
          errorData?.error
        );
      }

      const data: EmbeddingResponse = await response.json();

      return {
        embedding: data.data[0].embedding,
        model: data.model,
        usage: data.usage,
      };
    },

    /**
     * Create embeddings for multiple texts in a single batch request.
     * More efficient than calling createEmbedding multiple times.
     * Uses text-embedding-3-small (1536 dimensions) by default.
     *
     * @param texts - Array of texts to embed (max recommended: 100 per batch)
     * @param model - Embedding model to use
     * @returns Array of embeddings in the same order as input texts
     */
    async createEmbeddings(
      texts: string[],
      model: string = DEFAULT_EMBEDDING_MODEL
    ): Promise<BatchEmbeddingResult> {
      if (texts.length === 0) {
        return {
          embeddings: [],
          model,
          usage: { prompt_tokens: 0, total_tokens: 0 },
        };
      }

      const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          input: texts,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: { error?: OpenRouterError } | undefined;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Not JSON, use raw text
        }

        const errorMessage = errorData?.error?.message ?? errorText;
        throw new OpenRouterAPIError(
          `OpenRouter Embeddings API error: ${response.status} - ${errorMessage}`,
          response.status,
          errorData?.error
        );
      }

      const data: EmbeddingResponse = await response.json();

      // Sort by index to ensure order matches input
      const sortedData = [...data.data].sort((a, b) => a.index - b.index);

      return {
        embeddings: sortedData.map((d) => d.embedding),
        model: data.model,
        usage: data.usage,
      };
    },
  };
}

// ============================================================================
// Streaming Result Type
// ============================================================================

export interface StreamingResult {
  content: string | null;
  finishReason: string | null;
  usage?: ChatCompletionUsage;
  model: string;
}

// ============================================================================
// Error Class
// ============================================================================

export class OpenRouterAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorData?: OpenRouterError
  ) {
    super(message);
    this.name = "OpenRouterAPIError";
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Stream a chat completion and collect results.
 * Calls the callback for each content chunk, then returns the full result.
 */
export async function streamChatCompletion(
  client: ReturnType<typeof createOpenRouterClient>,
  request: ChatCompletionRequest,
  onChunk: (content: string) => Promise<void>
): Promise<StreamCompletionResult> {
  let fullContent = "";
  let usage: ChatCompletionUsage | undefined;
  let model = request.model;
  let finishReason: string | null = null;

  for await (const result of client.createStreamingCompletion(request)) {
    if (result.content) {
      fullContent += result.content;
      await onChunk(result.content);
    }
    if (result.usage) {
      usage = result.usage;
    }
    if (result.model) {
      model = result.model;
    }
    if (result.finishReason) {
      finishReason = result.finishReason;
    }
  }

  return {
    content: fullContent,
    model,
    finishReason,
    usage,
  };
}

export interface StreamCompletionResult {
  content: string;
  model: string;
  finishReason: string | null;
  usage?: ChatCompletionUsage;
}

// ============================================================================
// Default Client Factory
// ============================================================================

/**
 * Create an OpenRouter client using environment variables.
 * Throws if OPENROUTER_API_KEY is not set.
 */
export function createDefaultClient(): ReturnType<typeof createOpenRouterClient> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY environment variable is not set. " +
        "Get your API key from https://openrouter.ai/keys"
    );
  }

  return createOpenRouterClient({
    apiKey,
    siteUrl: process.env.CONVEX_SITE_URL ?? "https://localhost",
    siteName: "ClaudeBase",
  });
}
