/**
 * Step functions for the web scraping workflow.
 * Each step is marked with "use step" directive for durability.
 */

import Firecrawl from "@mendable/firecrawl-js";
import OpenAI from "openai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { FatalError } from "workflow";

// Lazy-initialized clients (to avoid build-time errors when env vars are missing)
let _firecrawl: Firecrawl | null = null;
let _openai: OpenAI | null = null;
let _convex: ConvexHttpClient | null = null;

function getFirecrawl(): Firecrawl {
  if (!_firecrawl) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY environment variable is not set");
    }
    _firecrawl = new Firecrawl({ apiKey });
  }
  return _firecrawl;
}

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

function getConvex(): ConvexHttpClient {
  if (!_convex) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is not set");
    }
    _convex = new ConvexHttpClient(url);
  }
  return _convex;
}

// ============================================================================
// Types
// ============================================================================

export interface WebScrapingInput {
  sourceId: string;
  organizationId: string;
  agentId: string;
  url: string;
  mode: "scrape" | "crawl";
  crawlLimit: number;
  embeddingModel: string;
  jobId?: string;
}

export interface ScrapedPage {
  url: string;
  title: string;
  content: string;
}

export interface TextChunk {
  content: string;
  chunkIndex: number;
  url: string;
}

export interface ChunkWithEmbedding extends TextChunk {
  embedding: number[];
}

// ============================================================================
// Step: Update Source Status
// ============================================================================

export async function updateSourceStatus(
  sourceId: string,
  status: "pending" | "processing" | "ready" | "error",
  errorMessage?: string
) {
  "use step";

  await getConvex().mutation(api.sources.updateStatus, {
    sourceId: sourceId as Id<"sources">,
    status,
    errorMessage,
  });
}

// ============================================================================
// Step: Update Crawled Pages Count
// ============================================================================

export async function updateCrawledPages(
  sourceId: string,
  crawledPages: number
) {
  "use step";

  await getConvex().mutation(api.sources.updateCrawledPages, {
    sourceId: sourceId as Id<"sources">,
    crawledPages,
  });
}

// ============================================================================
// Step: Start Job
// ============================================================================

export async function startJob(jobId: string) {
  "use step";

  await getConvex().mutation(api.jobs.startJob, {
    jobId: jobId as Id<"jobs">,
  });
}

// ============================================================================
// Step: Update Job Progress
// ============================================================================

export async function updateJobProgress(jobId: string, progress: number) {
  "use step";

  await getConvex().mutation(api.jobs.updateJobProgress, {
    jobId: jobId as Id<"jobs">,
    progress,
  });
}

// ============================================================================
// Step: Complete Job
// ============================================================================

export async function completeJob(jobId: string) {
  "use step";

  await getConvex().mutation(api.jobs.completeJob, {
    jobId: jobId as Id<"jobs">,
  });
}

// ============================================================================
// Step: Fail Job
// ============================================================================

export async function failJob(jobId: string, errorMessage: string) {
  "use step";

  await getConvex().mutation(api.jobs.failJob, {
    jobId: jobId as Id<"jobs">,
    errorMessage,
  });
}

// ============================================================================
// Step: Scrape Single Page
// ============================================================================

export async function scrapeSinglePage(url: string): Promise<ScrapedPage[]> {
  "use step";

  const doc = await getFirecrawl().scrape(url, {
    formats: ["markdown"],
  });

  const title = doc.metadata?.title ?? new URL(url).hostname;
  const content = doc.markdown ?? "";

  if (!content.trim()) {
    throw new FatalError(`No content found at URL: ${url}`);
  }

  return [
    {
      url,
      title,
      content,
    },
  ];
}

// ============================================================================
// Step: Crawl Website
// ============================================================================

export async function crawlWebsite(
  url: string,
  limit: number
): Promise<ScrapedPage[]> {
  "use step";

  // crawl() starts a crawl job and polls until completion
  const crawlJob = await getFirecrawl().crawl(url, {
    limit,
    scrapeOptions: {
      formats: ["markdown"],
    },
  });

  if (crawlJob.status === "failed" || crawlJob.status === "cancelled") {
    throw new FatalError(`Failed to crawl URL: ${url} (status: ${crawlJob.status})`);
  }

  const pages: ScrapedPage[] = [];

  for (const doc of crawlJob.data ?? []) {
    const pageUrl = doc.metadata?.url ?? url;
    const title = doc.metadata?.title ?? new URL(pageUrl).hostname;
    const content = doc.markdown ?? "";

    if (content.trim()) {
      pages.push({
        url: pageUrl,
        title,
        content,
      });
    }
  }

  if (pages.length === 0) {
    throw new FatalError(`No content found when crawling: ${url}`);
  }

  return pages;
}

// ============================================================================
// Step: Chunk Text from Pages
// ============================================================================

const CHUNK_SIZE_TOKENS = 500;
const CHUNK_OVERLAP_TOKENS = 100;
const CHARS_PER_TOKEN = 4; // Approximate for English text

export async function chunkPages(pages: ScrapedPage[]): Promise<TextChunk[]> {
  "use step";

  const chunkSizeChars = CHUNK_SIZE_TOKENS * CHARS_PER_TOKEN;
  const overlapChars = CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN;

  const allChunks: TextChunk[] = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    // Clean the text - normalize whitespace
    const cleanedText = page.content.replace(/\s+/g, " ").trim();

    let position = 0;

    while (position < cleanedText.length) {
      // Calculate end position for this chunk
      let end = Math.min(position + chunkSizeChars, cleanedText.length);

      // If not at the end, try to break at a sentence or word boundary
      if (end < cleanedText.length) {
        // Look for sentence boundary (. ! ? followed by space) within last 20% of chunk
        const searchStart = Math.max(
          position,
          end - Math.floor(chunkSizeChars * 0.2)
        );
        const searchRegion = cleanedText.slice(searchStart, end);
        const sentenceMatch = searchRegion.match(/[.!?]\s+(?=[A-Z])/g);

        if (sentenceMatch) {
          // Find the last sentence boundary
          const lastMatch = sentenceMatch[sentenceMatch.length - 1];
          const boundaryIndex = searchRegion.lastIndexOf(lastMatch);
          if (boundaryIndex !== -1) {
            end = searchStart + boundaryIndex + lastMatch.length - 1;
          }
        } else {
          // Fall back to word boundary
          const lastSpace = cleanedText.lastIndexOf(" ", end);
          if (lastSpace > position) {
            end = lastSpace;
          }
        }
      }

      const chunkContent = cleanedText.slice(position, end).trim();

      if (chunkContent.length > 0) {
        allChunks.push({
          content: chunkContent,
          chunkIndex: globalChunkIndex,
          url: page.url,
        });
        globalChunkIndex++;
      }

      // Move position forward, accounting for overlap
      position = end - overlapChars;

      // Prevent infinite loop if overlap is larger than remaining text
      if (position <= 0 || position >= cleanedText.length - 1) {
        break;
      }

      // Ensure we're making forward progress
      const minProgress =
        allChunks.length > 0 ? end - chunkSizeChars : 0;
      if (position <= minProgress) {
        position = end;
      }
    }
  }

  return allChunks;
}

// ============================================================================
// Step: Generate Embeddings
// ============================================================================

const EMBEDDING_BATCH_SIZE = 100;

export async function generateEmbeddings(
  chunks: TextChunk[],
  embeddingModel: string
): Promise<ChunkWithEmbedding[]> {
  "use step";

  const results: ChunkWithEmbedding[] = [];

  // Process in batches
  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    const texts = batch.map((chunk) => chunk.content);

    const response = await getOpenAI().embeddings.create({
      model: embeddingModel,
      input: texts,
    });

    // Match embeddings back to chunks
    for (let j = 0; j < batch.length; j++) {
      const embedding = response.data[j].embedding;
      results.push({
        ...batch[j],
        embedding,
      });
    }
  }

  return results;
}

// ============================================================================
// Step: Store Chunks in Convex
// ============================================================================

const STORAGE_BATCH_SIZE = 50;

export async function storeChunks(
  chunks: ChunkWithEmbedding[],
  input: WebScrapingInput,
  sourceName: string
): Promise<number> {
  "use step";

  let storedCount = 0;

  // Process in batches
  for (let i = 0; i < chunks.length; i += STORAGE_BATCH_SIZE) {
    const batch = chunks.slice(i, i + STORAGE_BATCH_SIZE);

    await getConvex().mutation(api.sources.insertChunks, {
      chunks: batch.map((chunk) => ({
        organizationId: input.organizationId as Id<"organizations">,
        agentId: input.agentId as Id<"agents">,
        sourceId: input.sourceId as Id<"sources">,
        content: chunk.content,
        embedding: chunk.embedding,
        embeddingModel: input.embeddingModel,
        metadata: {
          sourceType: "website",
          sourceName,
          url: chunk.url,
          chunkIndex: chunk.chunkIndex,
        },
      })),
    });

    storedCount += batch.length;
  }

  return storedCount;
}

// ============================================================================
// Step: Finalize Source
// ============================================================================

export async function finalizeSource(
  sourceId: string,
  chunkCount: number
): Promise<void> {
  "use step";

  await getConvex().mutation(api.sources.finalizeProcessing, {
    sourceId: sourceId as Id<"sources">,
    chunkCount,
  });
}
