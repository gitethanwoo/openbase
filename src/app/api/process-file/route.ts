/**
 * API endpoint to trigger file processing workflow.
 *
 * POST /api/process-file
 * Body: { sourceId: string }
 *
 * Triggers the Vercel Workflow to process the uploaded file:
 * - Creates a job record to track processing status
 * - Downloads from Convex storage
 * - Parses content (PDF, DOCX, TXT)
 * - Chunks text (500 tokens, 100 overlap)
 * - Generates embeddings via OpenAI
 * - Stores chunks in Convex
 * - Updates source and job status
 */

import { start } from "workflow/api";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { processFileWorkflow } from "../../../../workflows/file-processing";
import { JOB_TYPE } from "../../../../convex/jobs";

// Convex client for server-side operations
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface ProcessFileRequest {
  sourceId: string;
}

export async function POST(request: Request) {
  const body: ProcessFileRequest = await request.json();
  const { sourceId } = body;

  if (!sourceId) {
    return NextResponse.json(
      { error: "sourceId is required" },
      { status: 400 }
    );
  }

  // Fetch the source to validate it exists and get processing details
  const source = await convex.query(api.sources.getSource, {
    sourceId: sourceId as Id<"sources">,
  });

  if (!source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  if (source.status !== "pending") {
    return NextResponse.json(
      { error: `Source is already ${source.status}` },
      { status: 400 }
    );
  }

  if (!source.fileId) {
    return NextResponse.json(
      { error: "Source has no associated file" },
      { status: 400 }
    );
  }

  if (!source.mimeType) {
    return NextResponse.json(
      { error: "Source has no MIME type" },
      { status: 400 }
    );
  }

  // Get the agent to retrieve the embedding model
  const agent = await convex.query(api.agents.getAgent, {
    agentId: source.agentId,
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Create a job record to track this processing task
  const idempotencyKey = `file_processing_${sourceId}`;
  const jobResult = await convex.mutation(api.jobs.createJob, {
    organizationId: source.organizationId,
    jobType: JOB_TYPE.FILE_PROCESSING,
    sourceId: source._id,
    agentId: source.agentId,
    idempotencyKey,
  });

  if (jobResult.alreadyExists) {
    return NextResponse.json(
      { error: "Job already exists for this source" },
      { status: 409 }
    );
  }

  // Start the workflow
  const run = await start(processFileWorkflow, [
    {
      sourceId: source._id,
      organizationId: source.organizationId,
      agentId: source.agentId,
      fileId: source.fileId,
      mimeType: source.mimeType,
      fileName: source.name,
      embeddingModel: agent.embeddingModel,
      jobId: jobResult.jobId,
    },
  ]);

  // Update job with workflow run ID
  await convex.mutation(api.jobs.setWorkflowRunId, {
    jobId: jobResult.jobId,
    workflowRunId: run.runId,
  });

  return NextResponse.json({
    success: true,
    sourceId: source._id,
    jobId: jobResult.jobId,
    workflowRunId: run.runId,
    message: "File processing workflow started",
  });
}
