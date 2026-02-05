/**
 * Web Scraping Workflow
 *
 * Scrapes websites through the following pipeline:
 * 1. Update status to "processing"
 * 2. Scrape single page or crawl multiple pages via Firecrawl
 * 3. Chunk text (500 tokens, 100 token overlap)
 * 4. Generate embeddings via AI SDK (OpenRouter)
 * 5. Store chunks with embeddings in Convex
 * 6. Update status to "ready" or "error"
 */

import {
  type WebScrapingInput,
  updateSourceStatus,
  updateCrawledPages,
  scrapeSinglePage,
  crawlWebsite,
  chunkPages,
  generateEmbeddings,
  storeChunks,
  finalizeSource,
  startJob,
  updateJobProgress,
  completeJob,
  failJob,
} from "./steps";

export async function webScrapingWorkflow(input: WebScrapingInput) {
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

    // Step 3: Scrape or crawl the website
    const pages =
      input.mode === "scrape"
        ? await scrapeSinglePage(input.url)
        : await crawlWebsite(input.url, input.crawlLimit);
    if (input.jobId) {
      await updateJobProgress(input.jobId, 40);
    }

    // Step 4: Update crawled pages count
    await updateCrawledPages(input.sourceId, pages.length);

    // Step 5: Check if we have any content
    if (pages.length === 0) {
      const errorMsg = "No content could be scraped from the website";
      await updateSourceStatus(input.sourceId, "error", errorMsg);
      if (input.jobId) {
        await failJob(input.jobId, errorMsg);
      }
      return {
        success: false,
        error: "No content scraped",
        crawledPages: 0,
        chunkCount: 0,
      };
    }

    // Step 6: Chunk the text from all pages
    const chunks = await chunkPages(pages);
    if (input.jobId) {
      await updateJobProgress(input.jobId, 50);
    }

    if (chunks.length === 0) {
      const errorMsg = "No chunks could be created from the scraped content";
      await updateSourceStatus(input.sourceId, "error", errorMsg);
      if (input.jobId) {
        await failJob(input.jobId, errorMsg);
      }
      return {
        success: false,
        error: "No chunks created",
        crawledPages: pages.length,
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
    const sourceName = new URL(input.url).hostname;
    const storedCount = await storeChunks(
      chunksWithEmbeddings,
      input,
      sourceName
    );
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
      crawledPages: pages.length,
      chunkCount: storedCount,
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
      crawledPages: 0,
      chunkCount: 0,
    };
  }
}
