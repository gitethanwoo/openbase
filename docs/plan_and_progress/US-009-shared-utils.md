# US-009 - Shared utils - lib/utils.ts with helpers

- Status: Completed
- Owner: Claude
- Started: 2026-01-19
- Completed: 2026-01-19

## Objective

Create utility functions for common operations like token counting, text chunking, slug generation, UUID generation, and date formatting. These utilities support the knowledge base chunking and general platform operations.

## Plan

1. Extend existing lib/utils.ts (preserving shadcn cn function)
2. Add token counting function (approximation-based for simplicity)
3. Add text chunking function (500 tokens target, 100 token overlap)
4. Add slug generation utility
5. Add UUID generation utility
6. Add date formatting utilities
7. Run typecheck and lint to verify

## Done Criteria

- [x] lib/utils.ts file extended with new utilities
- [x] Token counting function implemented
- [x] Text chunking function (500 tokens target, 100 token overlap)
- [x] Slug generation utility
- [x] UUID generation utility
- [x] Date formatting utilities
- [x] pnpm run typecheck passes
- [x] pnpm run lint passes

## Progress

- 2026-01-19: Started implementation
- 2026-01-19: Extended lib/utils.ts with all utility functions
- 2026-01-19: Typecheck and lint passed, committing changes

## Verification

- `pnpm run typecheck` - passed
- `pnpm run lint` - passed

## Outcomes

- Extended src/lib/utils.ts with:
  - `countTokens()` - Token counting using ~4 chars/token approximation
  - `chunkText()` - Text chunking with configurable target/overlap tokens
  - `generateSlug()` - URL-friendly slug generation
  - `generateUUID()` - UUID v4 generation
  - `formatDateISO()`, `formatDateLong()`, `formatDateShort()`, `formatDateTime()`, `formatRelativeTime()` - Date formatting utilities

## Follow-ups

- Consider adding tiktoken for more accurate token counting if needed
