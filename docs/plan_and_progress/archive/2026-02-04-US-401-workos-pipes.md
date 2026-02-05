# US-401: WorkOS Pipes (Notion + Google Drive)

- Status: Completed
- Owner: ethanwoo
- Started: 2026-02-04
- Completed: 2026-02-04

## Objective

Implement WorkOS Pipes connectors for Notion and Google Drive so users can connect accounts, browse content, and import it as knowledge sources via the existing ingestion pipeline.

## Plan

1. Add schema fields and source types for connector-backed sources.
2. Implement Convex actions/mutations + workflows for Notion and Google Drive imports.
3. Add UI for connection + picker + import on the agent settings page.
4. Validate with typecheck and lint.

## Done Criteria

- Users can connect Notion and Google Drive via Pipes widget.
- Users can list and select Notion pages and Drive files.
- Selected items create sources and trigger import workflows.
- Imported content appears as sources with correct status and chunk counts.
- Typecheck and lint pass.

## Progress

- 2026-02-04: Started implementation. Reviewed existing sources/workflow pipeline and WorkOS SDK types.
- 2026-02-04: Added Notion/Google Drive source mutations, Pipes listing actions, workflows, and settings UI.

## Verification

- `npx convex codegen` (success)
- `pnpm run typecheck` (success)
- `pnpm run lint` (warnings: pre-existing unused vars and unused eslint-disable directives)

## Outcomes

- Added WorkOS Pipes listing actions, Notion/GDrive import workflows, and settings UI.

## Follow-ups

- Re-sync support for updated documents
- Bulk/folder import
