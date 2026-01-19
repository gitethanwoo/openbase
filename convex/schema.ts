import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    vertical: v.string(),
    allowedDomains: v.array(v.string()),
    rateLimitTokens: v.number(),
    rateLimitLastRefill: v.number(),
    plan: v.string(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    messageCreditsUsed: v.number(),
    messageCreditsLimit: v.number(),
    storageUsedKb: v.number(),
    storageLimitKb: v.number(),
    billingCycleStart: v.number(),
    defaultModel: v.string(),
    createdAt: v.number(),
    deletedAt: v.optional(v.number()),
  }).index("by_slug", ["slug"]),

  users: defineTable({
    organizationId: v.id("organizations"),
    workosUserId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    role: v.string(),
    createdAt: v.number(),
    lastLoginAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_workosUserId", ["workosUserId"]),

  agents: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    slug: v.string(),
    model: v.string(),
    temperature: v.number(),
    systemPrompt: v.string(),
    embeddingModel: v.string(),
    embeddingDimensions: v.number(),
    widgetConfig: v.object({
      primaryColor: v.string(),
      avatarUrl: v.optional(v.string()),
      welcomeMessage: v.string(),
      placeholderText: v.string(),
      position: v.string(),
    }),
    status: v.string(),
    needsRetraining: v.boolean(),
    lastTrainedAt: v.optional(v.number()),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_organizationId_slug", ["organizationId", "slug"]),

  sources: defineTable({
    organizationId: v.id("organizations"),
    agentId: v.id("agents"),
    type: v.string(),
    status: v.string(),
    name: v.string(),
    sizeKb: v.optional(v.number()),
    chunkCount: v.optional(v.number()),
    fileId: v.optional(v.id("_storage")),
    mimeType: v.optional(v.string()),
    url: v.optional(v.string()),
    crawledPages: v.optional(v.number()),
    question: v.optional(v.string()),
    answer: v.optional(v.string()),
    content: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    workflowRunId: v.optional(v.string()),
    contentHash: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_organizationId_agentId", ["organizationId", "agentId"])
    .index("by_status", ["status"]),

  chunks: defineTable({
    organizationId: v.id("organizations"),
    agentId: v.id("agents"),
    sourceId: v.id("sources"),
    content: v.string(),
    embedding: v.array(v.float64()),
    embeddingModel: v.string(),
    metadata: v.object({
      sourceType: v.string(),
      sourceName: v.string(),
      pageNumber: v.optional(v.number()),
      url: v.optional(v.string()),
      chunkIndex: v.number(),
    }),
    createdAt: v.number(),
  }).vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["organizationId", "agentId"],
  }),
});
