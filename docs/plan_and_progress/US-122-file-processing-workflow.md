# US-122 - Vercel Workflow: File Processing Pipeline

- Status: Completed
- Owner: AI Assistant
- Started: 2026-01-19
- Completed: 2026-01-19

## Objective

Create a Vercel Workflow that processes uploaded files (PDF, DOCX, TXT) into searchable chunks with embeddings. This enables RAG functionality by:
1. Downloading files from Convex storage
2. Parsing content from various file formats
3. Chunking text (500 tokens, 100 token overlap)
4. Generating embeddings via OpenAI (1536 dimensions)
5. Storing chunks with embeddings in Convex
6. Updating source status throughout the pipeline

## Plan

1. **Setup Vercel Workflow SDK**
   - Install `workflow` package
   - Configure `next.config.ts` with `withWorkflow()`
   - Create `workflows/` directory structure

2. **Create File Processing Workflow** (`workflows/file-processing/index.ts`)
   - Main workflow function with `"use workflow"` directive
   - Orchestrates the step functions in sequence
   - Handles errors and updates source status

3. **Implement Step Functions**
   - `downloadFile`: Download from Convex storage URL
   - `parseContent`: Extract text from PDF/DOCX/TXT
   - `chunkText`: Split into 500-token chunks with 100-token overlap
   - `generateEmbeddings`: Call OpenAI embeddings API
   - `storeChunks`: Batch insert chunks into Convex
   - `updateSourceStatus`: Update source record status

4. **Create API Trigger Endpoint** (`src/app/api/process-file/route.ts`)
   - Accepts sourceId, validates it exists
   - Triggers the workflow asynchronously
   - Returns workflow run ID

5. **Add Convex Mutations**
   - `updateSourceStatus`: Set status (pending/processing/ready/error)
   - `insertChunks`: Batch insert chunks with embeddings

## Done Criteria

- [x] Vercel Workflow created for file processing
- [x] Downloads file from Convex storage
- [x] Parses PDF/DOCX/TXT to extract text
- [x] Chunks text (500 tokens, 100 overlap)
- [x] Generates embeddings via OpenAI (1536 dimensions)
- [x] Stores chunks with embeddings in Convex
- [x] Updates source status: pending -> processing -> ready/error
- [x] pnpm run typecheck passes
- [x] pnpm run lint passes

## Progress

- 2026-01-19: Reviewed codebase structure, schema, and existing patterns. Created plan document.
- 2026-01-19: Implemented full workflow pipeline with step functions, Convex mutations, and API endpoint.

## Verification

```
$ pnpm run typecheck
> claudebase@0.1.0 typecheck
> tsc --noEmit
(passed)

$ pnpm run lint
> claudebase@0.1.0 lint
> eslint .
(0 errors, 8 warnings - all pre-existing or from generated files)

$ pnpm run build
> claudebase@0.1.0 build
> next build
✓ Compiled successfully
✓ Generating static pages (9/9)
(passed)
```

## Outcomes

**Files created:**
- `workflows/file-processing/index.ts` - Main workflow orchestrator
- `workflows/file-processing/steps.ts` - Step functions (download, parse, chunk, embed, store)
- `src/app/api/process-file/route.ts` - API endpoint to trigger workflow
- `convex/agents.ts` - Agent query for retrieving embedding model

**Files modified:**
- `next.config.ts` - Added `withWorkflow()` wrapper
- `convex/sources.ts` - Added `updateStatus`, `insertChunks`, `finalizeProcessing` mutations
- `package.json` - Added workflow, pdf-parse, mammoth, openai dependencies

## Follow-ups

- Integration with file upload flow to auto-trigger processing
- Progress reporting via streaming
- Retry logic for failed chunks
