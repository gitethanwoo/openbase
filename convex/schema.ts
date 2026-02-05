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
    agentCount: v.optional(v.number()),
    agentLimit: v.optional(v.number()),
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
    leadCaptureConfig: v.optional(
      v.object({
        enabled: v.boolean(),
        triggerMode: v.string(), // "after_messages" | "before_chat" | "manual"
        triggerAfterMessages: v.optional(v.number()), // Number of messages before showing form
        title: v.string(),
        description: v.optional(v.string()),
        fields: v.array(
          v.object({
            id: v.string(),
            type: v.string(), // "text" | "email" | "phone" | "textarea" | "select"
            label: v.string(),
            placeholder: v.optional(v.string()),
            required: v.boolean(),
            options: v.optional(v.array(v.string())), // For select fields
          })
        ),
        submitButtonText: v.string(),
        successMessage: v.string(),
      })
    ),
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
    providerResourceId: v.optional(v.string()),
    providerResourceUrl: v.optional(v.string()),
    providerLastModified: v.optional(v.number()),
    workosUserId: v.optional(v.string()),
    crawledPages: v.optional(v.number()),
    question: v.optional(v.string()),
    answer: v.optional(v.string()),
    content: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    workflowRunId: v.optional(v.string()),
    contentHash: v.optional(v.string()),
    embeddedContentHash: v.optional(v.string()),
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

  conversations: defineTable({
    organizationId: v.id("organizations"),
    agentId: v.id("agents"),
    agentVersion: v.number(),
    agentConfigSnapshot: v.object({
      name: v.string(),
      model: v.string(),
      temperature: v.number(),
      systemPrompt: v.string(),
    }),
    visitorId: v.string(),
    origin: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    messageCount: v.number(),
    sentiment: v.optional(v.string()),
    topics: v.array(v.string()),
    leadId: v.optional(v.id("leads")),
    createdAt: v.number(),
    lastMessageAt: v.number(),
  })
    .index("by_organizationId_agentId", ["organizationId", "agentId"])
    .index("by_visitorId", ["visitorId"]),

  messages: defineTable({
    organizationId: v.id("organizations"),
    conversationId: v.id("conversations"),
    role: v.string(),
    content: v.string(),
    chunksUsed: v.optional(v.array(v.id("chunks"))),
    citations: v.optional(
      v.array(
        v.object({
          chunkId: v.id("chunks"),
          sourceId: v.id("sources"),
          sourceName: v.string(),
          sourceType: v.string(),
          contentSnippet: v.string(),
          url: v.optional(v.string()),
          pageNumber: v.optional(v.number()),
        })
      )
    ),
    model: v.optional(v.string()),
    tokensPrompt: v.optional(v.number()),
    tokensCompletion: v.optional(v.number()),
    latencyMs: v.optional(v.number()),
    streamId: v.optional(v.string()),
    // LLM-as-judge evaluation results
    judgeEvaluation: v.optional(
      v.object({
        passed: v.boolean(),
        safetyScore: v.number(), // 0-1, 1 is safe
        groundednessScore: v.number(), // 0-1, 1 is grounded in context
        brandAlignmentScore: v.number(), // 0-1, 1 is aligned with brand
        reasoning: v.string(),
        flagged: v.boolean(),
        originalContent: v.optional(v.string()), // Store original if replaced
        judgeModel: v.string(),
        judgeLatencyMs: v.number(),
      })
    ),
    createdAt: v.number(),
  }).index("by_conversationId", ["conversationId"]),

  leads: defineTable({
    organizationId: v.id("organizations"),
    agentId: v.id("agents"),
    conversationId: v.optional(v.id("conversations")),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    customFields: v.optional(v.record(v.string(), v.string())),
    source: v.string(),
    createdAt: v.number(),
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_agentId", ["agentId"]),

  webhooks: defineTable({
    organizationId: v.id("organizations"),
    url: v.string(),
    events: v.array(v.string()),
    secret: v.string(),
    isActive: v.boolean(),
    lastTriggeredAt: v.optional(v.number()),
    lastStatus: v.optional(v.number()),
    createdAt: v.number(),
    deletedAt: v.optional(v.number()),
  }).index("by_organizationId", ["organizationId"]),

  auditLogs: defineTable({
    organizationId: v.id("organizations"),
    userId: v.optional(v.id("users")),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    changes: v.optional(v.record(v.string(), v.any())),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_organizationId", ["organizationId"]),

  usageEvents: defineTable({
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("agents")),
    conversationId: v.optional(v.id("conversations")),
    messageId: v.optional(v.id("messages")),
    eventType: v.string(),
    model: v.optional(v.string()),
    tokensPrompt: v.optional(v.number()),
    tokensCompletion: v.optional(v.number()),
    latencyMs: v.optional(v.number()),
    chunksCreated: v.optional(v.number()),
    embeddingModel: v.optional(v.string()),
    costEstimateCents: v.optional(v.number()),
    idempotencyKey: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_idempotencyKey", ["idempotencyKey"]),

  jobs: defineTable({
    organizationId: v.id("organizations"),
    jobType: v.string(),
    sourceId: v.optional(v.id("sources")),
    agentId: v.optional(v.id("agents")),
    status: v.string(),
    attemptCount: v.number(),
    maxAttempts: v.number(),
    scheduledAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    lastHeartbeat: v.optional(v.number()),
    progress: v.optional(v.number()),
    lastError: v.optional(v.string()),
    errorHistory: v.optional(v.array(v.string())),
    workflowRunId: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_organizationId_status", ["organizationId", "status"]),
});
