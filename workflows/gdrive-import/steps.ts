/**
 * Step functions for the Google Drive import workflow.
 */

import { ConvexHttpClient } from "convex/browser";
import { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { FatalError } from "workflow";
import { WorkOS } from "@workos-inc/node";
import {
  chunkText,
  generateEmbeddings,
  parseContent,
  type TextChunk,
  type ChunkWithEmbedding,
} from "../file-processing/steps";

const GDRIVE_PROVIDER = "google_drive";
const GDRIVE_API_BASE_URL = "https://www.googleapis.com/drive/v3";

const GDRIVE_EXPORT_MIME_TYPES: Record<string, string> = {
  "application/vnd.google-apps.document": "text/plain",
  "application/vnd.google-apps.spreadsheet": "text/csv",
};

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

export interface GDriveImportInput {
  sourceId: string;
  organizationId: string;
  agentId: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  fileUrl?: string;
  workosUserId: string;
  embeddingModel: string;
  jobId?: string;
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
// Step: Fetch Google Drive Content
// ============================================================================

async function getGDriveAccessToken(workosUserId: string): Promise<string> {
  const response = await getWorkOS().pipes.getAccessToken({
    provider: GDRIVE_PROVIDER,
    userId: workosUserId,
  });

  if (!response.active) {
    throw new FatalError(
      `Google Drive connection error: ${response.error.replace("_", " ")}`
    );
  }

  return response.accessToken.accessToken;
}

async function exportGDriveFile(
  fileId: string,
  exportMimeType: string,
  accessToken: string
): Promise<string> {
  const params = new URLSearchParams({ mimeType: exportMimeType });
  const response = await fetch(
    `${GDRIVE_API_BASE_URL}/files/${fileId}/export?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new FatalError(`GDrive export error: ${response.status} ${errorText}`);
  }

  return await response.text();
}

async function downloadGDriveFile(
  fileId: string,
  accessToken: string
): Promise<Buffer> {
  const response = await fetch(
    `${GDRIVE_API_BASE_URL}/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new FatalError(`GDrive download error: ${response.status} ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function fetchGDriveFileText(
  fileId: string,
  mimeType: string,
  workosUserId: string
): Promise<string> {
  "use step";

  const accessToken = await getGDriveAccessToken(workosUserId);
  const exportMimeType = GDRIVE_EXPORT_MIME_TYPES[mimeType];

  if (exportMimeType) {
    return await exportGDriveFile(fileId, exportMimeType, accessToken);
  }

  if (mimeType === "text/plain") {
    const buffer = await downloadGDriveFile(fileId, accessToken);
    return buffer.toString("utf-8");
  }

  const buffer = await downloadGDriveFile(fileId, accessToken);
  return await parseContent(buffer, mimeType);
}

// ============================================================================
// Step: Chunk, Embed, Store
// ============================================================================

const STORAGE_BATCH_SIZE = 50;

export async function storeChunks(
  chunks: ChunkWithEmbedding[],
  input: GDriveImportInput
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
          sourceType: "gdrive",
          sourceName: input.fileName,
          url: input.fileUrl,
          pageNumber: chunk.pageNumber,
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
