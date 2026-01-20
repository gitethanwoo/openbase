# US-107 - Settings Pages (Agent Config, Allowed Domains)

- Status: In Progress
- Owner: Claude
- Started: 2026-01-19
- Completed:

## Objective

Implement settings pages for agent configuration (widget config, allowed domains) and organization settings (name, defaults). Users need to be able to configure their agents and organizations with appropriate success notifications on save.

## Plan

1. Create agent settings page at `/dashboard/agents/[agentId]/settings`
2. Update Convex agents mutation to support widget config and allowed domains
3. Create organization settings page at `/dashboard/settings`
4. Add success notification component and integrate into settings forms
5. Run typecheck and lint to verify quality

## Done Criteria

- [ ] Agent settings: widget config, allowed domains
- [ ] Organization settings: name, defaults
- [ ] Changes saved with success notification
- [ ] pnpm run typecheck passes
- [ ] pnpm run lint passes

## Progress

- 2026-01-19: Started implementation, exploring codebase structure

## Verification

- Commands run (lint/typecheck/build) and results

## Outcomes

- What changed (links to PRs/commits)

## Follow-ups

- Deferred items or next steps
