/**
 * Web Scraping Workflow
 *
 * Scrapes websites through the following pipeline:
 * 1. Update status to "processing"
 * 2. Scrape single page or crawl multiple pages via Firecrawl
 * 3. Chunk text (500 tokens, 100 token overlap)
 * 4. Generate embeddings via OpenAI
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
} from "./steps";

export async function webScrapingWorkflow(input: WebScrapingInput) {
  "use workflow";

  try {
    // Step 1: Mark source as processing
    await updateSourceStatus(input.sourceId, "processing");

    // Step 2: Scrape or crawl the website
    const pages =
      input.mode === "scrape"
        ? await scrapeSinglePage(input.url)
        : await crawlWebsite(input.url, input.crawlLimit);

    // Step 3: Update crawled pages count
    await updateCrawledPages(input.sourceId, pages.length);

    // Step 4: Check if we have any content
    if (pages.length === 0) {
      await updateSourceStatus(
        input.sourceId,
        "error",
        "No content could be scraped from the website"
      );
      return {
        success: false,
        error: "No content scraped",
        crawledPages: 0,
        chunkCount: 0,
      };
    }

    // Step 5: Chunk the text from all pages
    const chunks = await chunkPages(pages);

    if (chunks.length === 0) {
      await updateSourceStatus(
        input.sourceId,
        "error",
        "No chunks could be created from the scraped content"
      );
      return {
        success: false,
        error: "No chunks created",
        crawledPages: pages.length,
        chunkCount: 0,
      };
    }

    // Step 6: Generate embeddings
    const chunksWithEmbeddings = await generateEmbeddings(
      chunks,
      input.embeddingModel
    );

    // Step 7: Store chunks in Convex
    const sourceName = new URL(input.url).hostname;
    const storedCount = await storeChunks(
      chunksWithEmbeddings,
      input,
      sourceName
    );

    // Step 8: Finalize - update source with chunk count and set status to ready
    await finalizeSource(input.sourceId, storedCount);

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

    return {
      success: false,
      error: errorMessage,
      crawledPages: 0,
      chunkCount: 0,
    };
  }
}
