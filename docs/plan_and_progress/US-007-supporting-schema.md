# US-007 - Supporting Schema

- Status: Completed
- Owner: Claude
- Started: 2026-01-19
- Completed: 2026-01-19

## Objective

Add supporting tables for leads, webhooks, audit logging, usage tracking, and job management to the Convex schema.

## Plan

1. Add `leads` table with organizationId, conversationId, name, email, phone, customFields, source, createdAt
2. Add `webhooks` table with organizationId, url, events, secret, isActive, lastTriggeredAt, lastStatus, createdAt, deletedAt
3. Add `auditLogs` table with organizationId, userId, action, resourceType, resourceId, changes, ipAddress, userAgent, createdAt
4. Add `usageEvents` table with organizationId, agentId, conversationId, messageId, eventType, model, tokensPrompt, tokensCompletion, latencyMs, chunksCreated, embeddingModel, costEstimateCents, idempotencyKey, createdAt
5. Add `jobs` table with organizationId, jobType, sourceId, agentId, status, attemptCount, maxAttempts, scheduledAt, startedAt, completedAt, lastHeartbeat, progress, lastError, errorHistory, workflowRunId, idempotencyKey, createdAt
6. Add appropriate indexes (by_organizationId for all, plus by_organizationId_status for jobs)
7. Run typecheck and lint to verify

## Done Criteria

- [x] All five tables added with correct fields
- [x] Appropriate indexes on organizationId for all tables
- [x] Index on jobs by (organizationId, status)
- [x] pnpm run typecheck passes
- [x] pnpm run lint passes

## Progress

- 2026-01-19: Starting implementation
- 2026-01-19: Added all five tables (leads, webhooks, auditLogs, usageEvents, jobs) to schema.ts
- 2026-01-19: Verified typecheck and lint pass

## Verification

- `pnpm run typecheck` - passed
- `pnpm run lint` - passed

## Outcomes

- Schema changes in convex/schema.ts (lines 164-237)

## Follow-ups

- None
