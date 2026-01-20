# US-135 - CORS validation (allowedDomains check)

- Status: Completed
- Owner: Claude
- Started: 2026-01-19
- Completed: 2026-01-19

## Objective

Validate request origins on widget API endpoints to ensure only authorized domains can use the widget. This prevents unauthorized embedding of the chat widget on websites not explicitly allowed by the organization.

## Plan

1. Create CORS validation utility with wildcard subdomain support
2. Integrate validation into `/api/chat` endpoint (Next.js)
3. Integrate validation into `/api/widget/[agentId]` endpoint (Next.js)
4. Integrate validation into `/chat-stream` endpoint (Convex HTTP action)
5. Return 403 Forbidden for unauthorized origins
6. Ensure empty allowedDomains array allows all origins (backwards compatible)

## Done Criteria

- [x] Origin header validated on chat requests
- [x] Checked against organization's allowedDomains
- [x] Wildcard subdomain support (e.g., `*.example.com`)
- [x] Unauthorized origins return 403
- [x] pnpm run typecheck passes
- [x] pnpm run lint passes

## Progress

- 2026-01-19: Explored codebase to understand existing allowedDomains schema and HTTP endpoints
- 2026-01-19: Created `src/lib/cors.ts` and `convex/cors.ts` with validation utilities
- 2026-01-19: Integrated validation into all three endpoints
- 2026-01-19: Verified typecheck and lint pass

## Verification

```bash
$ pnpm run typecheck
> tsc --noEmit
# Passed (no errors)

$ pnpm run lint
> eslint .
# Passed (only pre-existing warnings)
```

## Outcomes

Files changed:
- `src/lib/cors.ts` - New CORS validation utility for Next.js
- `convex/cors.ts` - New CORS validation utility for Convex
- `src/app/api/chat/route.ts` - Added origin validation
- `src/app/api/widget/[agentId]/route.ts` - Added origin validation
- `convex/chatStream.ts` - Added origin validation

## Follow-ups

- Consider adding CORS validation to the OPTIONS preflight handlers for stricter security
- Consider caching organization allowedDomains to reduce database queries
