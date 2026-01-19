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
} from "./steps";

export async function processFileWorkflow(input: FileProcessingInput) {
  "use workflow";

  try {
    // Step 1: Mark source as processing
    await updateSourceStatus(input.sourceId, "processing");

    // Step 2: Download file from Convex storage
    const fileBuffer = await downloadFile(input.fileId);

    // Step 3: Parse content based on file type
    const textContent = await parseContent(fileBuffer, input.mimeType);

    // Step 4: Check if we have any content
    if (!textContent || textContent.trim().length === 0) {
      await updateSourceStatus(
        input.sourceId,
        "error",
        "No text content could be extracted from the file"
      );
      return {
        success: false,
        error: "No text content extracted",
        chunkCount: 0,
      };
    }

    // Step 5: Chunk the text
    const chunks = await chunkText(textContent);

    if (chunks.length === 0) {
      await updateSourceStatus(
        input.sourceId,
        "error",
        "No chunks could be created from the file content"
      );
      return {
        success: false,
        error: "No chunks created",
        chunkCount: 0,
      };
    }

    // Step 6: Generate embeddings
    const chunksWithEmbeddings = await generateEmbeddings(
      chunks,
      input.embeddingModel
    );

    // Step 7: Store chunks in Convex
    const storedCount = await storeChunks(chunksWithEmbeddings, input);

    // Step 8: Finalize - update source with chunk count and set status to ready
    await finalizeSource(input.sourceId, storedCount);

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

    return {
      success: false,
      error: errorMessage,
      chunkCount: 0,
    };
  }
}
