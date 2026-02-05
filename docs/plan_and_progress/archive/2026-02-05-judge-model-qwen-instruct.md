# Set Judge Model to Qwen 3 30B Instruct

- Status: Completed
- Owner: Codex
- Started: 2026-02-05
- Completed: 2026-02-05

## Objective

Update the safety/judge model to use the requested Qwen instruct model for evaluations.

## Plan

1. Update judge model constant.
2. Run typecheck.

## Done Criteria

- Judge model constant uses `qwen/qwen3-30b-a3b-instruct-2507`.
- `pnpm run typecheck` passes.

## Progress

- 2026-02-05: Started judge model update.

## Verification

- `pnpm run typecheck` (success)

## Outcomes

- What changed (links to PRs/commits)

## Follow-ups

- Deferred items or next steps
