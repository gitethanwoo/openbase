# US-005 - Knowledge Schema

- Status: In Progress
- Owner: AI Assistant
- Started: 2026-01-19
- Completed:

## Objective

Implement the RAG infrastructure tables (sources and chunks) to store knowledge base content and embeddings for the white-label AI chatbot platform.

## Plan

1. Add sources table with all fields for document/content tracking
2. Add chunks table with embedding field and metadata
3. Add regular indexes on sources (by org+agent, by status)
4. Add vector index on chunks.embedding with 1536 dimensions and filters

## Done Criteria

- [x] sources table with all fields
- [x] chunks table with all fields including embedding
- [x] Index on sources by (organizationId, agentId)
- [x] Index on sources by status
- [x] Vector index on chunks.embedding with 1536 dimensions
- [x] Vector index filters by organizationId and agentId
- [x] pnpm run typecheck passes
- [x] pnpm run lint passes

## Progress

- 2026-01-19: Started implementation, reviewed existing schema and Convex vector index documentation
- 2026-01-19: Added sources table with all fields and indexes
- 2026-01-19: Added chunks table with vector index (1536 dims, filtered by organizationId and agentId)
- 2026-01-19: Verified typecheck and lint pass

## Verification

- `pnpm run typecheck` - PASS
- `pnpm run lint` - PASS

## Outcomes

- Updated convex/schema.ts with sources and chunks tables

## Follow-ups

- None identified
