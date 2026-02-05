# Use Qwen 3 235B A22B 2507 for Judge + Chat Option

- Status: Completed
- Owner: Codex
- Started: 2026-02-05
- Completed: 2026-02-05

## Objective

Update the judge model to the requested Qwen 3 235B A22B 2507 model and add it as a selectable chat model in the dashboard.

## Plan

1. Confirm OpenRouter model metadata (context length).
2. Update judge model constant and supported model list.
3. Add model to agent/org dropdowns and run typecheck.

## Done Criteria

- Judge model constant uses `qwen/qwen3-235b-a22b-2507`.
- `SUPPORTED_MODELS` includes the model with correct context length.
- Model appears in agent and org model dropdowns.
- `pnpm run typecheck` passes.

## Progress

- 2026-02-05: Started Qwen 3 235B A22B 2507 judge + chat option update.

## Verification

- `pnpm run typecheck` (success)

## Outcomes

- What changed (links to PRs/commits)

## Follow-ups

- Deferred items or next steps
