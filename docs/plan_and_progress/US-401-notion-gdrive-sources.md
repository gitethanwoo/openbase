# US-401: Add from Notion / Add from Google Drive

- Status: Not Started
- Owner: ethanwoo
- Started:
- Completed:

## Objective

Let users connect their Notion workspace or Google Drive account and import pages/files as knowledge sources for their agents. Uses WorkOS Pipes for OAuth token management, then calls provider APIs directly to list and ingest content.

This unlocks a major UX improvement: instead of manually uploading files or pasting text, users can pull directly from the tools they already use.

## Context

- WorkOS Pipes handles OAuth flows, token refresh, and credential storage for both Google and Notion
- Pipes provides a drop-in React widget for connecting accounts, and a single API call (`workos.pipes.getAccessToken()`) to get a valid provider token
- Existing ingestion pipeline (chunking, embedding, storage) is reusable — we just need new source types that feed into it
- Current source types: `file`, `website`, `text`, `qa`
- Existing infra: Vercel Workflow SDK for long-running jobs, Convex for storage/vectors, OpenRouter for embeddings

## Plan

### 1. WorkOS Pipes Setup

- Enable Pipes in WorkOS dashboard, configure Google and Notion providers with required scopes
- Google scopes: `drive.readonly` (list and read files)
- Notion scopes: read content (pages, databases, blocks)
- Use shared credentials for development; register own OAuth apps for production
- Add `@workos-inc/widgets` dependency (for Pipes widget)

### 2. Schema Changes

- Add new source types to `sources` table: `"notion"` and `"gdrive"`
- Add fields to source schema:
  - `providerResourceId?: string` — Notion page ID or Google Drive file ID
  - `providerResourceUrl?: string` — direct link back to original doc
  - `providerLastModified?: number` — timestamp for future re-sync detection
- Add `connectedAccounts` table or rely on Pipes widget state (evaluate whether we need to persist connection status locally)

### 3. Backend: Token Retrieval

- Create a server-side utility to call `workos.pipes.getAccessToken({ provider, userId, organizationId })` using existing WorkOS SDK
- This returns a fresh, valid OAuth token for the connected provider
- Handle case where user hasn't connected their account yet (return clear error)

### 4. Backend: Provider API Integration

**Google Drive:**
- Use token to call Google Drive API v3
- `GET /drive/v3/files` — list user's files (filter to supported types: Docs, Sheets, PDFs, text files)
- `GET /drive/v3/files/{id}/export` — export Google Docs/Sheets as plain text or markdown
- `GET /drive/v3/files/{id}?alt=media` — download binary files (PDFs)
- Use existing PDF/text parsing from file processing workflow

**Notion:**
- Use token to call Notion API v1
- `POST /v1/search` — list pages and databases the user has shared
- `GET /v1/blocks/{id}/children` — recursively fetch page content (blocks)
- Convert Notion blocks to plain text/markdown (headings, paragraphs, lists, code, tables, etc.)
- Handle pagination (Notion API returns max 100 blocks per request)

### 5. Ingestion Workflows

- Create `workflows/notion-import/` — fetches Notion page content, converts to text, feeds into existing chunk → embed → store pipeline
- Create `workflows/gdrive-import/` — fetches Drive file content, parses (reusing existing PDF/DOCX/text parsers), feeds into chunk → embed → store pipeline
- Both workflows create job records for progress tracking (reuse existing `jobs` table)
- Both set source status through `pending → processing → ready | error`

### 6. Frontend: Connection UI

- Add Pipes widget to agent settings page (or a dedicated "Integrations" section)
- Widget shows "Connect Google" / "Connect Notion" with authorization flow
- Once connected, show provider-specific file/page picker:
  - **Google Drive**: file browser or search, with type filters
  - **Notion**: page/database search, show workspace structure
- Selected items create source records and trigger import workflows
- Show import progress using existing job tracking UI patterns

### 7. Convex Mutations & Queries

- `createNotionSource(agentId, pageId, title)` — creates source record, triggers workflow
- `createGDriveSource(agentId, fileId, fileName, mimeType)` — creates source record, triggers workflow
- `listNotionPages(userId)` — server-side action that fetches available pages via Notion API
- `listGDriveFiles(userId)` — server-side action that fetches available files via Drive API

## Done Criteria

- [ ] User can connect their Google account via Pipes widget in dashboard
- [ ] User can connect their Notion account via Pipes widget in dashboard
- [ ] User can browse and select Google Drive files to import as agent sources
- [ ] User can browse and select Notion pages to import as agent sources
- [ ] Imported content goes through existing chunking/embedding pipeline
- [ ] Sources appear in sources list with correct type, status, and chunk count
- [ ] Error states handled (disconnected account, permission denied, empty content)
- [ ] Typecheck and lint pass

## Progress

_(updates will be logged here as work progresses)_

## Verification

_(commands run and results will be logged here)_

## Outcomes

_(PRs and commits will be linked here)_

## Follow-ups

- **Re-sync**: Detect when source documents change and offer re-import (use `providerLastModified`)
- **Bulk import**: Select multiple files/pages at once
- **Folder import**: Import entire Google Drive folders or Notion databases
- **Additional providers**: Dropbox, Box, Confluence, etc. (all supported by Pipes)
- **Incremental sync**: Only re-embed changed sections instead of full re-import
