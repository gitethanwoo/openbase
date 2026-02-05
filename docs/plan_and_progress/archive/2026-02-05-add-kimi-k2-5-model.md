# Add MoonshotAI Kimi K2.5 Model

- Status: Completed
- Owner: Codex
- Started: 2026-02-05
- Completed: 2026-02-05

## Objective

Add the correct OpenRouter model IDs for MoonshotAI Kimi K2.5 and Qwen 3 30B A3B to supported model lists so they can be selected in the dashboard and used in chat streaming.

## Plan

1. Confirm the exact OpenRouter model ID and context length.
2. Add the model to server-side supported models and UI model dropdowns.
3. Run typecheck.

## Done Criteria

- Kimi K2.5 and Qwen 3 30B A3B appear in the agent and org model dropdowns.
- `SUPPORTED_MODELS` includes the correct OpenRouter model IDs and context length.
- `pnpm run typecheck` passes.

## Progress

- 2026-02-05: Started adding MoonshotAI Kimi K2.5 and Qwen 3 30B A3B model support.

## Verification

- `pnpm run typecheck` (success)

## Outcomes

- What changed (links to PRs/commits)

## Follow-ups

- Deferred items or next steps
