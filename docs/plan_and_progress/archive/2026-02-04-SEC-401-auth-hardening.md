# SEC-401: WorkOS Pipes Auth Hardening

- Status: Completed
- Owner: ethanwoo
- Started: 2026-02-04
- Completed: 2026-02-04

## Objective

Remove trust in client-supplied WorkOS user IDs and enforce authenticated identity in Convex for Pipes listing and source creation.

## Plan

1. Enable Convex auth with WorkOS JWTs and wire AuthKit access tokens into Convex client.
2. Update actions/mutations to derive WorkOS user ID from `ctx.auth` and verify membership.
3. Update client calls to remove `workosUserId` arguments and re-run codegen/tests.

## Done Criteria

- Pipes listing actions and source creation do not accept client-supplied WorkOS user IDs.
- Actions/mutations use authenticated identity and verify membership.
- Convex auth integration is enabled and client passes access tokens.
- Typecheck and lint pass.

## Progress

- 2026-02-04: Started auth-hardening pass.
- 2026-02-04: Integrated Convex auth, removed client-supplied WorkOS IDs, added membership checks.

## Verification

- `npx convex env set WORKOS_CLIENT_ID <redacted>` (success)
- `npx convex codegen` (success)
- `pnpm run typecheck` (success)
- `pnpm run lint` (warnings: pre-existing unused vars and unused eslint-disable directives)

## Outcomes

- Enforced authenticated WorkOS identity in Pipes listing and source creation.

## Follow-ups

- Extend membership checks to other source creation paths.
