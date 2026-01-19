# US-004 - Agent Schema

- Status: Completed
- Owner: Claude
- Started: 2026-01-19
- Completed: 2026-01-19

## Objective

Create the agents table to store chatbot configurations with widget config nested object.

## Plan

1. Add agents table to convex/schema.ts with all required fields
2. Add indexes: by_organizationId and by_organizationId_slug
3. Run typecheck and lint to verify
4. Commit changes

## Done Criteria

- [x] agents table with all fields including widgetConfig nested object
- [x] Index on agents by organizationId
- [x] Index on agents by (organizationId, slug)
- [x] pnpm run typecheck passes
- [x] pnpm run lint passes

## Progress

- 2026-01-19: Starting implementation
- 2026-01-19: Added agents table with all fields and indexes, typecheck and lint pass

## Verification

- `pnpm run typecheck` - passes
- `pnpm run lint` - passes

## Outcomes

- Added agents table to convex/schema.ts with:
  - All required fields: organizationId, name, slug, model, temperature, systemPrompt, embeddingModel, embeddingDimensions, widgetConfig, status, needsRetraining, lastTrainedAt, version, createdAt, updatedAt, deletedAt
  - widgetConfig nested object with: primaryColor, avatarUrl, welcomeMessage, placeholderText, position
  - Index by_organizationId on organizationId
  - Index by_organizationId_slug on (organizationId, slug)

## Follow-ups

- None
