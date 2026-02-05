# Use AI SDK Everywhere

- Status: Completed
- Owner: Codex
- Started: 2026-02-05
- Completed: 2026-02-05

## Objective

Replace remaining OpenAI SDK and custom OpenRouter HTTP usage with AI SDK for chat streaming and embeddings.

## Plan

1. Update Convex chat streaming to use `streamText` with OpenRouter provider.
2. Replace embeddings generation in Convex actions and workflows with AI SDK `embedMany` using OpenRouter provider.
3. Verify behavior with real payloads and run typecheck.

## Done Criteria

- No `openai` SDK usage remains in Convex or workflows.
- Chat streaming and embeddings both use AI SDK + OpenRouter provider.
- Typecheck passes and a basic streaming/embedding call works.

## Progress

- 2026-02-05: Replaced Convex chat streaming with AI SDK `streamText` and removed Braintrust manual logging.
- 2026-02-05: Swapped embeddings to AI SDK `embedMany` in Convex actions and Vercel workflows; updated docs/comments.
- 2026-02-05: Removed `openai` dependency.

## Verification

- `node --input-type=module -e "...embedMany..."` (confirmed embeddings shape)
- `node --input-type=module -e "...streamText..."` (confirmed response/usage shape)
- `pnpm run typecheck`

## Outcomes

- Chat streaming and embedding generation now use AI SDK + OpenRouter provider.

## Follow-ups

- If you want `convex/openrouter.ts` removed, we can regenerate Convex API types and delete it.
