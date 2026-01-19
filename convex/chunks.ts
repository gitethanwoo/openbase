import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Internal query to fetch full chunk documents by their IDs.
 * Used by the vector search action to retrieve chunk content and metadata.
 */
export const getChunksByIds = internalQuery({
  args: {
    chunkIds: v.array(v.id("chunks")),
  },
  handler: async (ctx, args): Promise<Doc<"chunks">[]> => {
    const chunks = await Promise.all(
      args.chunkIds.map((id) => ctx.db.get(id))
    );
    return chunks.filter((chunk): chunk is Doc<"chunks"> => chunk !== null);
  },
});

/**
 * Result type for vector search including similarity score.
 */
export type VectorSearchResult = {
  _id: Id<"chunks">;
  _score: number;
  content: string;
  metadata: {
    sourceType: string;
    sourceName: string;
    pageNumber?: number;
    url?: string;
    chunkIndex: number;
  };
  sourceId: Id<"sources">;
  embeddingModel: string;
  createdAt: number;
};

/**
 * Perform vector similarity search (k-NN) on chunk embeddings.
 *
 * Searches the chunks table using the provided embedding vector,
 * filtered by organizationId and agentId. Returns the top-k most
 * similar chunks with their content, metadata, and similarity scores.
 */
export const vectorSearch = action({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("agents"),
    embedding: v.array(v.float64()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<VectorSearchResult[]> => {
    const limit = args.limit ?? 10;

    // Perform vector search using the by_embedding index
    const searchResults = await ctx.vectorSearch("chunks", "by_embedding", {
      vector: args.embedding,
      limit: Math.min(Math.max(limit, 1), 256), // Clamp between 1-256
      filter: (q) =>
        q.eq("organizationId", args.organizationId) &&
        q.eq("agentId", args.agentId),
    });

    if (searchResults.length === 0) {
      return [];
    }

    // Fetch full chunk documents
    const chunkIds = searchResults.map((result) => result._id);
    const chunks: Doc<"chunks">[] = await ctx.runQuery(
      internal.chunks.getChunksByIds,
      { chunkIds }
    );

    // Create a map of chunk ID to score
    const scoreMap = new Map(
      searchResults.map((result) => [result._id.toString(), result._score])
    );

    // Combine chunks with their scores
    const results: VectorSearchResult[] = chunks.map((chunk) => ({
      _id: chunk._id,
      _score: scoreMap.get(chunk._id.toString()) ?? 0,
      content: chunk.content,
      metadata: chunk.metadata,
      sourceId: chunk.sourceId,
      embeddingModel: chunk.embeddingModel,
      createdAt: chunk.createdAt,
    }));

    // Sort by score descending (most similar first)
    results.sort((a, b) => b._score - a._score);

    return results;
  },
});
