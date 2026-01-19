/**
 * Step functions for the file processing workflow.
 * Each step is marked with "use step" directive for durability.
 */

import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import OpenAI from "openai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { FatalError } from "workflow";

// Lazy-initialized clients (to avoid build-time errors when env vars are missing)
let _openai: OpenAI | null = null;
let _convex: ConvexHttpClient | null = null;

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

export interface FileProcessingInput {
  sourceId: string;
  organizationId: string;
  agentId: string;
  fileId: string;
  mimeType: string;
  fileName: string;
  embeddingModel: string;
  jobId?: string;
}

export interface TextChunk {
  content: string;
  chunkIndex: number;
  pageNumber?: number;
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
// Step: Download File from Convex Storage
// ============================================================================

export async function downloadFile(fileId: string): Promise<Buffer> {
  "use step";

  // Get the signed URL from Convex
  const url = await getConvex().query(api.sources.getFileUrl, {
    fileId: fileId as Id<"_storage">,
  });

  if (!url) {
    throw new FatalError(`No URL found for file ${fileId}`);
  }

  // Download the file
  const response = await fetch(url);
  if (!response.ok) {
    throw new FatalError(
      `Failed to download file: ${response.status} ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ============================================================================
// Step: Parse File Content
// ============================================================================

export async function parseContent(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  "use step";

  switch (mimeType) {
    case "application/pdf":
      return parsePdf(buffer);

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return parseDocx(buffer);

    case "text/plain":
      return buffer.toString("utf-8");

    default:
      throw new FatalError(`Unsupported file type: ${mimeType}`);
  }
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const pdf = new PDFParse({ data: buffer });
  const result = await pdf.getText();
  await pdf.destroy();
  return result.text;
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// ============================================================================
// Step: Chunk Text
// ============================================================================

const CHUNK_SIZE_TOKENS = 500;
const CHUNK_OVERLAP_TOKENS = 100;
const CHARS_PER_TOKEN = 4; // Approximate for English text

export async function chunkText(text: string): Promise<TextChunk[]> {
  "use step";

  const chunkSizeChars = CHUNK_SIZE_TOKENS * CHARS_PER_TOKEN;
  const overlapChars = CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN;

  const chunks: TextChunk[] = [];
  let position = 0;
  let chunkIndex = 0;

  // Clean the text - normalize whitespace
  const cleanedText = text.replace(/\s+/g, " ").trim();

  while (position < cleanedText.length) {
    // Calculate end position for this chunk
    let end = Math.min(position + chunkSizeChars, cleanedText.length);

    // If not at the end, try to break at a sentence or word boundary
    if (end < cleanedText.length) {
      // Look for sentence boundary (. ! ? followed by space) within last 20% of chunk
      const searchStart = Math.max(position, end - Math.floor(chunkSizeChars * 0.2));
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
      chunks.push({
        content: chunkContent,
        chunkIndex,
      });
      chunkIndex++;
    }

    // Move position forward, accounting for overlap
    position = end - overlapChars;

    // Prevent infinite loop if overlap is larger than remaining text
    if (position <= 0 || position >= cleanedText.length - 1) {
      break;
    }

    // Ensure we're making forward progress
    const minProgress = chunks.length > 0 ? end - chunkSizeChars : 0;
    if (position <= minProgress) {
      position = end;
    }
  }

  return chunks;
}

// ============================================================================
// Step: Generate Embeddings
// ============================================================================

const EMBEDDING_BATCH_SIZE = 100; // OpenAI supports up to 2048 inputs per request

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

const STORAGE_BATCH_SIZE = 50; // Store in smaller batches to avoid timeout

export async function storeChunks(
  chunks: ChunkWithEmbedding[],
  input: FileProcessingInput
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
          sourceType: "file",
          sourceName: input.fileName,
          pageNumber: chunk.pageNumber,
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
