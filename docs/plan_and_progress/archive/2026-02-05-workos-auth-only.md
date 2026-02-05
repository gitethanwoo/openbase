# WorkOS-Only Auth (Remove Convex Auth)

- Status: Completed
- Owner: Codex
- Started: 2026-02-05
- Completed: 2026-02-05

## Objective

Ensure authentication is exclusively WorkOS AuthKit, removing any Convex-auth usage introduced on this branch.

## Plan

1. Identify Convex auth usage in frontend and Convex backend.
2. Remove Convex auth wiring and align with WorkOS AuthKit docs.
3. Verify auth flows still work and typecheck passes.

## Done Criteria

- No Convex auth imports/usages remain in app code.
- WorkOS AuthKit integration remains intact for login/logout and session handling.
- `pnpm run typecheck` passes.

## Progress

- 2026-02-05: Removed Convex auth config, switched integrations/sources to accept WorkOS user IDs, and updated dashboard connectors to pass them.

## Verification

- `npx convex codegen` (success)
- `pnpm run typecheck` (success)

## Outcomes

- Updated auth wiring to use WorkOS only; removed Convex auth usage.

## Follow-ups

- Deferred items or next steps
