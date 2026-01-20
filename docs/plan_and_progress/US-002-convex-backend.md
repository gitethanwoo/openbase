# US-002 - Initialize Convex backend

- Status: In Progress
- Owner: Claude
- Started: 2026-01-19
- Completed:

## Objective

Set up Convex as the backend for the white-label AI chatbot platform. This provides the database, real-time subscriptions, and serverless functions infrastructure.

## Plan

1. Install Convex dependency
2. Run `npx convex init` to create convex/ directory
3. Configure ConvexProvider in Next.js app layout
4. Verify connection with `npx convex dev`
5. Run typecheck and lint to ensure quality

## Done Criteria

- Convex installed and initialized in project
- convex/ directory created with _generated folder
- ConvexProvider configured in app layout
- npx convex dev runs and connects successfully
- Convex dashboard accessible for the project
- pnpm run typecheck passes
- pnpm run lint passes

## Progress

- 2026-01-19: Started implementation

## Verification

- Commands run (lint/typecheck/build) and results

## Outcomes

- What changed (links to PRs/commits)

## Follow-ups

- Deferred items or next steps
