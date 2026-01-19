# US-003 - Core Tenant Schema

- Status: Completed
- Owner: Claude
- Started: 2026-01-19
- Completed: 2026-01-19

## Objective

Create the multi-tenant foundation tables (organizations and users) to enable organization-scoped features throughout the platform.

## Plan

1. Define organizations table with all required fields (name, slug, vertical, billing, limits, etc.)
2. Define users table with all required fields (organizationId, workosUserId, email, role, etc.)
3. Add indexes for efficient querying (slug, organizationId, workosUserId)
4. Verify with typecheck and lint

## Done Criteria

- [x] organizations table with all fields: name, slug, vertical, allowedDomains, rateLimitTokens, rateLimitLastRefill, plan, stripeCustomerId, stripeSubscriptionId, messageCreditsUsed, messageCreditsLimit, storageUsedKb, storageLimitKb, billingCycleStart, defaultModel, createdAt, deletedAt
- [x] users table with all fields: organizationId, workosUserId, email, name, avatarUrl, role, createdAt, lastLoginAt, deletedAt
- [x] Index on organizations.slug
- [x] Index on users by organizationId
- [x] Index on users by workosUserId
- [x] pnpm run typecheck passes
- [x] pnpm run lint passes

## Progress

- 2026-01-19: Implemented organizations and users tables in convex/schema.ts with all required fields and indexes

## Verification

- `pnpm run typecheck` - passed
- `pnpm run lint` - passed

## Outcomes

- Updated convex/schema.ts with organizations and users table definitions

## Follow-ups

- None identified
