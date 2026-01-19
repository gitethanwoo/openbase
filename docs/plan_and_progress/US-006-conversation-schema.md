# US-006 - Conversation Schema

- Status: Completed
- Owner: AI Assistant
- Started: 2026-01-19
- Completed: 2026-01-19

## Objective

Add conversations and messages tables to support chat history storage and analytics.

## Plan

1. Add conversations table with all fields: organizationId, agentId, agentVersion, agentConfigSnapshot, visitorId, origin, userAgent, ipAddress, country, city, messageCount, sentiment, topics, leadId, createdAt, lastMessageAt
2. Add messages table with all fields: organizationId, conversationId, role, content, chunksUsed, citations, model, tokensPrompt, tokensCompletion, latencyMs, streamId, createdAt
3. Add indexes: conversations by (organizationId, agentId), conversations by visitorId, messages by conversationId
4. Run typecheck and lint

## Done Criteria

- conversations table with all specified fields
- messages table with all specified fields
- Index on conversations by (organizationId, agentId)
- Index on conversations by visitorId
- Index on messages by conversationId
- pnpm run typecheck passes
- pnpm run lint passes

## Progress

- 2026-01-19: Starting implementation
- 2026-01-19: Added conversations table with agentConfigSnapshot nested object, visitorId, origin, userAgent, ipAddress, country, city, messageCount, sentiment, topics, leadId
- 2026-01-19: Added messages table with citations array of objects, chunksUsed, model, tokensPrompt, tokensCompletion, latencyMs, streamId
- 2026-01-19: Added all required indexes
- 2026-01-19: Verified typecheck and lint pass

## Verification

- `pnpm run typecheck` - passed
- `pnpm run lint` - passed

## Outcomes

- Added conversations and messages tables to convex/schema.ts

## Follow-ups

- None identified
