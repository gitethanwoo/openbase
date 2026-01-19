# US-123 - Website Scraping via Firecrawl API

- Status: Completed
- Owner: Claude
- Started: 2026-01-19
- Completed: 2026-01-19

## Objective

Enable users to scrape websites and add web content to their knowledge base using the Firecrawl API. Support both single page scraping and full site crawling modes.

## Plan

1. Install Firecrawl SDK (@mendable/firecrawl-js)
2. Add `createWebSource` mutation to Convex sources module
3. Add `updateCrawledPages` mutation for tracking progress
4. Create web scraping workflow (reuses existing chunk/embed/store steps)
5. Create API endpoint for triggering scraping
6. Run typecheck and lint to verify

## Done Criteria

- [x] Endpoint accepts URL for scraping
- [x] Firecrawl API integration configured
- [x] Supports single page and crawl modes
- [x] Scraped content processed → chunks → embeddings
- [x] Source tracks crawledPages count
- [x] pnpm run typecheck passes
- [x] pnpm run lint passes

## Progress

- 2026-01-19: Explored codebase, understood existing patterns for file processing workflow
- 2026-01-19: Installed @mendable/firecrawl-js SDK
- 2026-01-19: Added createWebSource and updateCrawledPages mutations to convex/sources.ts
- 2026-01-19: Created workflows/web-scraping/ with index.ts and steps.ts
- 2026-01-19: Created POST /api/scrape-website endpoint
- 2026-01-19: All typecheck and lint checks pass

## Verification

- `pnpm run typecheck` - passes (no errors)
- `pnpm run lint` - passes (only warnings in unrelated generated/existing files)

## Outcomes

Files created/modified:
- `convex/sources.ts` - Added createWebSource, updateCrawledPages mutations
- `workflows/web-scraping/index.ts` - Main workflow orchestration
- `workflows/web-scraping/steps.ts` - Step functions for Firecrawl, chunking, embeddings
- `src/app/api/scrape-website/route.ts` - API endpoint
- `package.json` - Added @mendable/firecrawl-js dependency

## Follow-ups

- Add rate limiting for Firecrawl API calls
- Add progress tracking during crawl (webhook support)
- Add support for filtering/excluding URL patterns during crawl
