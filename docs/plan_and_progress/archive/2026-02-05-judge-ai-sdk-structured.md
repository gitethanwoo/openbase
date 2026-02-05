# Use AI SDK Structured Output for Judge

- Status: Completed
- Owner: Codex
- Started: 2026-02-05
- Completed: 2026-02-05

## Objective

Move judge evaluation to the AI SDK with structured output using a Zod schema to avoid JSON parsing and improve reliability.

## Plan

1. Replace custom OpenRouter client usage in judge with AI SDK `generateText` + `Output.object`.
2. Update dependencies to include Zod for schemas.
3. Run typecheck.

## Done Criteria

- Judge uses AI SDK `generateText` with structured output schema.
- Zod added as a dependency.
- `pnpm run typecheck` passes.

## Progress

- 2026-02-05: Replaced custom OpenRouter judge call with AI SDK generateText + structured output schema (Zod).

## Verification

- `pnpm run typecheck` (success)
- `npx convex run testHelpers:createTestData` (success)
- `npx convex run chat:createConversation '{...}'` (success)
- `curl -i -N -X POST https://patient-porpoise-900.convex.site/chat-stream ...` (200, streamed response)

## Outcomes

- What changed (links to PRs/commits)

## Follow-ups

- Deferred items or next steps
