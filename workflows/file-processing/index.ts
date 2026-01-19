/**
 * File Processing Workflow
 *
 * Processes uploaded files through the following pipeline:
 * 1. Update status to "processing"
 * 2. Download file from Convex storage
 * 3. Parse content (PDF, DOCX, or TXT)
 * 4. Chunk text (500 tokens, 100 token overlap)
 * 5. Generate embeddings via OpenAI
 * 6. Store chunks with embeddings in Convex
 * 7. Update status to "ready" or "error"
 */

import {
  type FileProcessingInput,
  updateSourceStatus,
  downloadFile,
  parseContent,
  chunkText,
  generateEmbeddings,
  storeChunks,
  finalizeSource,
  startJob,
  updateJobProgress,
  completeJob,
  failJob,
} from "./steps";

export async function processFileWorkflow(input: FileProcessingInput) {
  "use workflow";

  try {
    // Step 1: Start job tracking (if jobId provided)
    if (input.jobId) {
      await startJob(input.jobId);
    }

    // Step 2: Mark source as processing
    await updateSourceStatus(input.sourceId, "processing");
    if (input.jobId) {
      await updateJobProgress(input.jobId, 10);
    }

    // Step 3: Download file from Convex storage
    const fileBuffer = await downloadFile(input.fileId);
    if (input.jobId) {
      await updateJobProgress(input.jobId, 20);
    }

    // Step 4: Parse content based on file type
    const textContent = await parseContent(fileBuffer, input.mimeType);
    if (input.jobId) {
      await updateJobProgress(input.jobId, 40);
    }

    // Step 5: Check if we have any content
    if (!textContent || textContent.trim().length === 0) {
      const errorMsg = "No text content could be extracted from the file";
      await updateSourceStatus(input.sourceId, "error", errorMsg);
      if (input.jobId) {
        await failJob(input.jobId, errorMsg);
      }
      return {
        success: false,
        error: "No text content extracted",
        chunkCount: 0,
      };
    }

    // Step 6: Chunk the text
    const chunks = await chunkText(textContent);
    if (input.jobId) {
      await updateJobProgress(input.jobId, 50);
    }

    if (chunks.length === 0) {
      const errorMsg = "No chunks could be created from the file content";
      await updateSourceStatus(input.sourceId, "error", errorMsg);
      if (input.jobId) {
        await failJob(input.jobId, errorMsg);
      }
      return {
        success: false,
        error: "No chunks created",
        chunkCount: 0,
      };
    }

    // Step 7: Generate embeddings
    const chunksWithEmbeddings = await generateEmbeddings(
      chunks,
      input.embeddingModel
    );
    if (input.jobId) {
      await updateJobProgress(input.jobId, 80);
    }

    // Step 8: Store chunks in Convex
    const storedCount = await storeChunks(chunksWithEmbeddings, input);
    if (input.jobId) {
      await updateJobProgress(input.jobId, 95);
    }

    // Step 9: Finalize - update source with chunk count and set status to ready
    await finalizeSource(input.sourceId, storedCount);

    // Step 10: Mark job as completed
    if (input.jobId) {
      await completeJob(input.jobId);
    }

    return {
      success: true,
      chunkCount: storedCount,
      textLength: textContent.length,
    };
  } catch (error) {
    // Update source status to error
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    await updateSourceStatus(input.sourceId, "error", errorMessage);

    // Mark job as failed
    if (input.jobId) {
      await failJob(input.jobId, errorMessage);
    }

    return {
      success: false,
      error: errorMessage,
      chunkCount: 0,
    };
  }
}
