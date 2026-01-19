# US-125 - Embedding generation via OpenRouter

- Status: Completed
- Owner: AI
- Started: 2026-01-19
- Completed: 2026-01-19

## Objective

Implement embedding generation utility using OpenRouter's embeddings API with text-embedding-3-small model (1536 dimensions) for vector search in RAG.

## Plan

1. Add embedding types and constants to `convex/openrouter.ts`
2. Implement `createEmbedding()` for single text embedding
3. Implement `createEmbeddings()` for batch processing (more efficient)
4. Add error handling with proper typed errors
5. Run typecheck and lint

## Done Criteria

- [x] Utility function for embedding generation
- [x] Uses text-embedding-3-small (1536 dimensions)
- [x] Batch processing for efficiency
- [x] Error handling for API failures
- [x] pnpm run typecheck passes
- [x] pnpm run lint passes

## Progress

- 2026-01-19: Researched OpenRouter embeddings API - endpoint is `/api/v1/embeddings`, supports batch input, model is `openai/text-embedding-3-small` with 8192 token context
- 2026-01-19: Implemented embedding types, constants, and client methods

## Verification

```
$ pnpm run typecheck
> claudebase@0.1.0 typecheck
> tsc --noEmit
(no errors)

$ pnpm run lint
> claudebase@0.1.0 lint
> eslint .
(0 errors, 8 warnings in unrelated files)
```

## Outcomes

- Added `EmbeddingRequest`, `EmbeddingData`, `EmbeddingUsage`, `EmbeddingResponse`, `EmbeddingResult`, `BatchEmbeddingResult` types
- Added `EMBEDDING_MODELS` constant with text-embedding-3-small and text-embedding-3-large
- Added `DEFAULT_EMBEDDING_MODEL` and `DEFAULT_EMBEDDING_DIMENSIONS` constants
- Added `getEmbeddingModelInfo()` and `isEmbeddingModelSupported()` helper functions
- Added `createEmbedding()` method for single text embedding
- Added `createEmbeddings()` method for batch embedding (more efficient)

## Follow-ups

- None identified
