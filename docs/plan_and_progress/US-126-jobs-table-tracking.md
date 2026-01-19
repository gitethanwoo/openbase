# US-126 - Jobs table tracking (status, progress, retries)

- Status: Completed
- Owner: Claude
- Started: 2026-01-19
- Completed: 2026-01-19

## Objective

Implement job tracking for ingestion tasks so users can see processing status. This includes creating job records, tracking status/progress, retry logic, and linking to Vercel Workflows.

## Plan

1. Create `convex/jobs.ts` with mutations and queries:
   - `createJob`: Create job record when ingestion starts
   - `startJob`: Mark job as processing, record startedAt
   - `updateJobProgress`: Update progress percentage
   - `completeJob`: Mark job as completed
   - `failJob`: Mark job as failed, handle retry logic
   - `getJob`: Query single job
   - `listJobs`: Query jobs for an organization
   - `getJobBySource`: Get job associated with a source

2. Integrate with existing workflows:
   - Update API routes to create jobs before starting workflows
   - Update workflows to update job progress during processing

## Done Criteria

- [x] Job record created for each ingestion task
- [x] Status: pending, processing, completed, failed
- [x] Progress percentage updated during processing
- [x] Retry logic with maxAttempts
- [x] workflowRunId links to Vercel Workflow
- [x] pnpm run typecheck passes
- [x] pnpm run lint passes

## Progress

- 2026-01-19: Analyzed existing schema (jobs table already defined), sources.ts, and workflow files
- 2026-01-19: Created convex/jobs.ts with all job management functions (createJob, startJob, updateJobProgress, completeJob, failJob, setWorkflowRunId, getJob, getJobBySource, listJobs, getJobStats)
- 2026-01-19: Updated API routes (process-file, scrape-website) to create jobs and link workflow run IDs
- 2026-01-19: Updated workflow files to track job progress (10%, 20%, 40%, 50%, 80%, 95%, 100%)
- 2026-01-19: Fixed unused imports, typecheck and lint pass

## Verification

- `pnpm run typecheck` - passes
- `pnpm run lint` - passes (no new warnings introduced)

## Outcomes

- New file: `convex/jobs.ts` - Job management mutations and queries
- Modified: `src/app/api/process-file/route.ts` - Creates job, links workflow run ID
- Modified: `src/app/api/scrape-website/route.ts` - Creates job, links workflow run ID
- Modified: `workflows/file-processing/index.ts` - Job progress tracking
- Modified: `workflows/file-processing/steps.ts` - Job step functions
- Modified: `workflows/web-scraping/index.ts` - Job progress tracking
- Modified: `workflows/web-scraping/steps.ts` - Job step functions

## Follow-ups

- None identified
