/**
 * Step functions for the Notion import workflow.
 */

import { ConvexHttpClient } from "convex/browser";
import { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { FatalError } from "workflow";
import { WorkOS } from "@workos-inc/node";
import {
  chunkText,
  generateEmbeddings,
  type TextChunk,
  type ChunkWithEmbedding,
} from "../file-processing/steps";

const NOTION_PROVIDER = "notion";
const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2025-09-03";

// Lazy-initialized clients
let _convex: ConvexHttpClient | null = null;
let _workos: WorkOS | null = null;

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

function getWorkOS(): WorkOS {
  if (!_workos) {
    const apiKey = process.env.WORKOS_API_KEY;
    if (!apiKey) {
      throw new Error("WORKOS_API_KEY environment variable is not set");
    }
    _workos = new WorkOS(apiKey);
  }
  return _workos;
}

// ============================================================================
// Types
// ============================================================================

export interface NotionImportInput {
  sourceId: string;
  organizationId: string;
  agentId: string;
  pageId: string;
  pageTitle: string;
  pageUrl?: string;
  workosUserId: string;
  embeddingModel: string;
  jobId?: string;
}

type NotionRichText = {
  plain_text: string;
};

type NotionBlock = {
  id: string;
  type: string;
  has_children: boolean;
  paragraph?: { rich_text: NotionRichText[] };
  heading_1?: { rich_text: NotionRichText[] };
  heading_2?: { rich_text: NotionRichText[] };
  heading_3?: { rich_text: NotionRichText[] };
  bulleted_list_item?: { rich_text: NotionRichText[] };
  numbered_list_item?: { rich_text: NotionRichText[] };
  to_do?: { rich_text: NotionRichText[]; checked?: boolean };
  toggle?: { rich_text: NotionRichText[] };
  quote?: { rich_text: NotionRichText[] };
  callout?: { rich_text: NotionRichText[] };
  code?: { rich_text: NotionRichText[]; language?: string };
  table_row?: { cells: NotionRichText[][] };
  child_page?: { title?: string };
  child_database?: { title?: string };
  bookmark?: { url: string };
  image?: { type: "external" | "file"; external?: { url: string }; file?: { url: string } };
};

type NotionBlocksResponse = {
  results: NotionBlock[];
  next_cursor: string | null;
  has_more: boolean;
};

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
// Step: Job Tracking
// ============================================================================

export async function startJob(jobId: string) {
  "use step";

  await getConvex().mutation(api.jobs.startJob, {
    jobId: jobId as Id<"jobs">,
  });
}

export async function updateJobProgress(jobId: string, progress: number) {
  "use step";

  await getConvex().mutation(api.jobs.updateJobProgress, {
    jobId: jobId as Id<"jobs">,
    progress,
  });
}

export async function completeJob(jobId: string) {
  "use step";

  await getConvex().mutation(api.jobs.completeJob, {
    jobId: jobId as Id<"jobs">,
  });
}

export async function failJob(jobId: string, errorMessage: string) {
  "use step";

  await getConvex().mutation(api.jobs.failJob, {
    jobId: jobId as Id<"jobs">,
    errorMessage,
  });
}

// ============================================================================
// Step: Fetch Notion Content
// ============================================================================

async function getNotionAccessToken(workosUserId: string): Promise<string> {
  const response = await getWorkOS().pipes.getAccessToken({
    provider: NOTION_PROVIDER,
    userId: workosUserId,
  });

  if (!response.active) {
    throw new FatalError(
      `Notion connection error: ${response.error.replace("_", " ")}`
    );
  }

  return response.accessToken.accessToken;
}

async function fetchBlockChildren(
  blockId: string,
  accessToken: string
): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let nextCursor: string | null = null;

  while (true) {
    const params = new URLSearchParams({ page_size: "100" });
    if (nextCursor) {
      params.set("start_cursor", nextCursor);
    }

    const response = await fetch(
      `${NOTION_API_BASE_URL}/blocks/${blockId}/children?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Notion-Version": NOTION_VERSION,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new FatalError(`Notion API error: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as NotionBlocksResponse;
    blocks.push(...data.results);

    if (!data.has_more || !data.next_cursor) {
      break;
    }

    nextCursor = data.next_cursor;
  }

  return blocks;
}

function richTextToPlain(richText?: NotionRichText[]): string {
  if (!richText) return "";
  return richText.map((text) => text.plain_text).join("").trim();
}

function blockToText(block: NotionBlock, depth: number): string {
  const indent = "  ".repeat(depth);

  switch (block.type) {
    case "paragraph":
      return `${indent}${richTextToPlain(block.paragraph?.rich_text)}`;
    case "heading_1":
      return `${indent}# ${richTextToPlain(block.heading_1?.rich_text)}`;
    case "heading_2":
      return `${indent}## ${richTextToPlain(block.heading_2?.rich_text)}`;
    case "heading_3":
      return `${indent}### ${richTextToPlain(block.heading_3?.rich_text)}`;
    case "bulleted_list_item":
      return `${indent}- ${richTextToPlain(block.bulleted_list_item?.rich_text)}`;
    case "numbered_list_item":
      return `${indent}1. ${richTextToPlain(block.numbered_list_item?.rich_text)}`;
    case "to_do":
      return `${indent}- [${block.to_do?.checked ? "x" : " "}] ${richTextToPlain(
        block.to_do?.rich_text
      )}`;
    case "toggle":
      return `${indent}> ${richTextToPlain(block.toggle?.rich_text)}`;
    case "quote":
      return `${indent}> ${richTextToPlain(block.quote?.rich_text)}`;
    case "callout":
      return `${indent}> ${richTextToPlain(block.callout?.rich_text)}`;
    case "code": {
      const language = block.code?.language ?? "";
      const content = richTextToPlain(block.code?.rich_text);
      return `${indent}\`\`\`${language}\n${content}\n${indent}\`\`\``;
    }
    case "table_row": {
      const cells = block.table_row?.cells ?? [];
      const row = cells.map((cell) => richTextToPlain(cell)).join(" | ");
      return `${indent}${row}`;
    }
    case "child_page":
      return `${indent}Page: ${block.child_page?.title ?? "Untitled"}`;
    case "child_database":
      return `${indent}Database: ${block.child_database?.title ?? "Untitled"}`;
    case "bookmark":
      return `${indent}${block.bookmark?.url ?? ""}`;
    case "image":
      return `${indent}${
        block.image?.type === "external"
          ? block.image.external?.url ?? ""
          : block.image?.file?.url ?? ""
      }`;
    default:
      return "";
  }
}

async function blocksToText(
  blocks: NotionBlock[],
  accessToken: string,
  depth: number
): Promise<string[]> {
  const lines: string[] = [];

  for (const block of blocks) {
    const text = blockToText(block, depth);
    if (text.trim()) {
      lines.push(text);
    }

    if (block.has_children) {
      const children = await fetchBlockChildren(block.id, accessToken);
      const childLines = await blocksToText(children, accessToken, depth + 1);
      lines.push(...childLines);
    }
  }

  return lines;
}

export async function fetchNotionPageText(
  pageId: string,
  workosUserId: string
): Promise<string> {
  "use step";

  const accessToken = await getNotionAccessToken(workosUserId);
  const rootBlocks = await fetchBlockChildren(pageId, accessToken);
  const lines = await blocksToText(rootBlocks, accessToken, 0);

  return lines.join("\n");
}

// ============================================================================
// Step: Chunk, Embed, Store
// ============================================================================

const STORAGE_BATCH_SIZE = 50;

export async function storeChunks(
  chunks: ChunkWithEmbedding[],
  input: NotionImportInput
): Promise<number> {
  "use step";

  let storedCount = 0;

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
          sourceType: "notion",
          sourceName: input.pageTitle,
          url: input.pageUrl,
          chunkIndex: chunk.chunkIndex,
        },
      })),
    });

    storedCount += batch.length;
  }

  return storedCount;
}

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

export { chunkText, generateEmbeddings, type TextChunk };
