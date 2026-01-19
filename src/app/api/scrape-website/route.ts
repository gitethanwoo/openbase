/**
 * API endpoint to scrape a website and add it to the knowledge base.
 *
 * POST /api/scrape-website
 * Body: {
 *   organizationId: string,
 *   agentId: string,
 *   url: string,
 *   mode?: "scrape" | "crawl",  // default: "scrape"
 *   crawlLimit?: number         // default: 10, max: 100
 * }
 *
 * Triggers the Vercel Workflow to:
 * - Scrape single page or crawl multiple pages via Firecrawl
 * - Chunks text (500 tokens, 100 overlap)
 * - Generates embeddings via OpenAI
 * - Stores chunks in Convex
 * - Updates source status
 */

import { start } from "workflow/api";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { webScrapingWorkflow } from "../../../../workflows/web-scraping";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const MAX_CRAWL_LIMIT = 100;
const DEFAULT_CRAWL_LIMIT = 10;

interface ScrapeWebsiteRequest {
  organizationId: string;
  agentId: string;
  url: string;
  mode?: "scrape" | "crawl";
  crawlLimit?: number;
}

export async function POST(request: Request) {
  const body: ScrapeWebsiteRequest = await request.json();
  const { organizationId, agentId, url } = body;
  const mode = body.mode ?? "scrape";
  const crawlLimit = Math.min(body.crawlLimit ?? DEFAULT_CRAWL_LIMIT, MAX_CRAWL_LIMIT);

  // Validate required fields
  if (!organizationId) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 }
    );
  }

  if (!agentId) {
    return NextResponse.json(
      { error: "agentId is required" },
      { status: 400 }
    );
  }

  if (!url) {
    return NextResponse.json(
      { error: "url is required" },
      { status: 400 }
    );
  }

  // Validate mode
  if (!["scrape", "crawl"].includes(mode)) {
    return NextResponse.json(
      { error: 'mode must be "scrape" or "crawl"' },
      { status: 400 }
    );
  }

  // Create the web source record
  let sourceResult;
  try {
    sourceResult = await convex.mutation(api.sources.createWebSource, {
      organizationId: organizationId as Id<"organizations">,
      agentId: agentId as Id<"agents">,
      url,
      mode,
      crawlLimit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create source";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Get the agent to retrieve the embedding model
  const agent = await convex.query(api.agents.getAgent, {
    agentId: agentId as Id<"agents">,
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Start the workflow
  await start(webScrapingWorkflow, [
    {
      sourceId: sourceResult.sourceId,
      organizationId,
      agentId,
      url,
      mode,
      crawlLimit,
      embeddingModel: agent.embeddingModel,
    },
  ]);

  return NextResponse.json({
    success: true,
    sourceId: sourceResult.sourceId,
    url,
    mode,
    crawlLimit: mode === "crawl" ? crawlLimit : undefined,
    message: mode === "scrape"
      ? "Single page scraping workflow started"
      : `Website crawling workflow started (limit: ${crawlLimit} pages)`,
  });
}
