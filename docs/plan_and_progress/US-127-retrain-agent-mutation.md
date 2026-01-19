# US-127 - Retrain Agent Mutation

- Status: Completed
- Owner: Claude
- Started: 2026-01-19
- Completed: 2026-01-19

## Objective

Implement a mutation that triggers retraining for an agent by re-embedding sources with changed contentHash. This allows users to update their agent's knowledge base when sources change.

## Plan

1. Add `embeddedContentHash` field to sources schema to track what hash was last embedded
2. Add internal mutation to delete chunks by sourceId
3. Create `retrainAgent` mutation in convex/agents.ts that:
   - Finds sources with `status="ready"` where `contentHash !== embeddedContentHash` (or `embeddedContentHash` is null)
   - Deletes old chunks for changed sources
   - Schedules re-embedding for each changed source
   - Creates an internal action to finalize training (update `lastTrainedAt`, set `needsRetraining=false`)
4. Run typecheck and lint

## Done Criteria

- Mutation triggers retraining for an agent
- Only re-embeds sources with changed contentHash
- Updates agent.lastTrainedAt on completion
- Sets agent.needsRetraining = false
- pnpm run typecheck passes
- pnpm run lint passes

## Progress

- 2026-01-19: Started implementation. Analyzed existing schema and source processing patterns.
- 2026-01-19: Added `embeddedContentHash` field to sources schema.
- 2026-01-19: Implemented `retrainAgent` mutation, `retrainAgentSources` action, and helper mutations.
- 2026-01-19: Fixed lint error (prefer-const for sourceName variable).

## Verification

- `pnpm run typecheck` - PASSED
- `pnpm run lint` - PASSED (only pre-existing warnings in generated files and braintrust.ts)

## Outcomes

- Added `embeddedContentHash` field to sources schema to track what content hash was last embedded
- Updated `finalizeProcessing` and `finalizeProcessingInternal` to set `embeddedContentHash`
- Created `retrainAgent` mutation that:
  - Finds sources with `contentHash !== embeddedContentHash`
  - Schedules `retrainAgentSources` action to re-embed changed sources
  - Returns count of sources to be retrained
- Created supporting internal functions:
  - `retrainAgentSources` - action to delete old chunks and re-embed
  - `getSourceInternal` - query to get source details
  - `deleteChunksBySource` - mutation to delete chunks for a source
  - `insertChunksForRetrain` - mutation to insert new chunks
  - `updateSourceEmbeddedHash` - mutation to update source after re-embedding
  - `completeRetraining` - mutation to set `needsRetraining=false` and `lastTrainedAt`

## Follow-ups

- File and website sources skip re-embedding (content not stored in DB) - would need workflow re-trigger
- Consider adding a sourceId index on chunks table for faster deletion if performance becomes an issue
