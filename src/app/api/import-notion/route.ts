import { start } from "workflow/api";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { notionImportWorkflow } from "../../../../workflows/notion-import";
import { JOB_TYPE } from "../../../../convex/jobs";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface ImportNotionRequest {
  sourceId: string;
}

export async function POST(request: Request) {
  const body: ImportNotionRequest = await request.json();
  const { sourceId } = body;

  if (!sourceId) {
    return NextResponse.json({ error: "sourceId is required" }, { status: 400 });
  }

  const source = await convex.query(api.sources.getSource, {
    sourceId: sourceId as Id<"sources">,
  });

  if (!source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  if (source.type !== "notion") {
    return NextResponse.json(
      { error: "Source is not a Notion source" },
      { status: 400 }
    );
  }

  if (source.status !== "pending") {
    return NextResponse.json(
      { error: `Source is already ${source.status}` },
      { status: 400 }
    );
  }

  if (!source.providerResourceId) {
    return NextResponse.json(
      { error: "Source has no Notion page ID" },
      { status: 400 }
    );
  }

  if (!source.workosUserId) {
    return NextResponse.json(
      { error: "Source has no WorkOS user ID" },
      { status: 400 }
    );
  }

  const agent = await convex.query(api.agents.getAgent, {
    agentId: source.agentId,
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const idempotencyKey = `notion_import_${sourceId}`;
  const jobResult = await convex.mutation(api.jobs.createJob, {
    organizationId: source.organizationId,
    jobType: JOB_TYPE.NOTION_IMPORT,
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

  const run = await start(notionImportWorkflow, [
    {
      sourceId: source._id,
      organizationId: source.organizationId,
      agentId: source.agentId,
      pageId: source.providerResourceId,
      pageTitle: source.name,
      pageUrl: source.providerResourceUrl ?? undefined,
      workosUserId: source.workosUserId,
      embeddingModel: agent.embeddingModel,
      jobId: jobResult.jobId,
    },
  ]);

  await convex.mutation(api.jobs.setWorkflowRunId, {
    jobId: jobResult.jobId,
    workflowRunId: run.runId,
  });

  return NextResponse.json({
    success: true,
    sourceId: source._id,
    jobId: jobResult.jobId,
    workflowRunId: run.runId,
    message: "Notion import workflow started",
  });
}
