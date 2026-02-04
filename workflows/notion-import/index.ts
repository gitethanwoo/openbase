/**
 * Notion Import Workflow
 *
 * Fetches a Notion page, converts it to text, chunks, embeds, and stores.
 */

import {
  type NotionImportInput,
  updateSourceStatus,
  fetchNotionPageText,
  chunkText,
  generateEmbeddings,
  storeChunks,
  finalizeSource,
  startJob,
  updateJobProgress,
  completeJob,
  failJob,
} from "./steps";

export async function notionImportWorkflow(input: NotionImportInput) {
  "use workflow";

  try {
    if (input.jobId) {
      await startJob(input.jobId);
    }

    await updateSourceStatus(input.sourceId, "processing");
    if (input.jobId) {
      await updateJobProgress(input.jobId, 10);
    }

    const textContent = await fetchNotionPageText(
      input.pageId,
      input.workosUserId
    );
    if (input.jobId) {
      await updateJobProgress(input.jobId, 40);
    }

    if (!textContent || textContent.trim().length === 0) {
      const errorMsg = "No text content extracted from Notion page";
      await updateSourceStatus(input.sourceId, "error", errorMsg);
      if (input.jobId) {
        await failJob(input.jobId, errorMsg);
      }
      return { success: false, error: errorMsg, chunkCount: 0 };
    }

    const chunks = await chunkText(textContent);
    if (input.jobId) {
      await updateJobProgress(input.jobId, 55);
    }

    if (chunks.length === 0) {
      const errorMsg = "No chunks could be created from Notion content";
      await updateSourceStatus(input.sourceId, "error", errorMsg);
      if (input.jobId) {
        await failJob(input.jobId, errorMsg);
      }
      return { success: false, error: errorMsg, chunkCount: 0 };
    }

    const chunksWithEmbeddings = await generateEmbeddings(
      chunks,
      input.embeddingModel
    );
    if (input.jobId) {
      await updateJobProgress(input.jobId, 80);
    }

    const storedCount = await storeChunks(chunksWithEmbeddings, input);
    if (input.jobId) {
      await updateJobProgress(input.jobId, 95);
    }

    await finalizeSource(input.sourceId, storedCount);

    if (input.jobId) {
      await completeJob(input.jobId);
    }

    return { success: true, chunkCount: storedCount };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    await updateSourceStatus(input.sourceId, "error", errorMessage);

    if (input.jobId) {
      await failJob(input.jobId, errorMessage);
    }

    return { success: false, error: errorMessage, chunkCount: 0 };
  }
}
