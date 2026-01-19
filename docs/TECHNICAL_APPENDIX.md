# Technical Appendix (Draft)

This doc holds implementation sketches and code-ish examples that are useful during build-out, but are intentionally kept out of `docs/PROJECT_SPEC.md` so the project spec stays product + architecture focused.

The source of truth is the codebase once implemented.

## Vertical Configuration (Example)

Each vertical customizes the platform without code changes. Current draft shape/examples:

```typescript
// verticals/faith.ts
export const faithVertical = {
  id: "faith",
  branding: {
    name: "FaithBase",
    tagline: "AI for Churches",
    primaryColor: "#4F46E5",
    logo: "/logos/faithbase.svg",
  },

  promptTemplates: [
    {
      name: "Welcoming Church Assistant",
      prompt:
        "You are a friendly assistant for {{church_name}}. Help visitors learn about service times, beliefs, ministries, and how to get connected...",
    },
    {
      name: "Sermon Q&A Helper",
      prompt:
        "You help answer questions about sermons and biblical topics based on the church's teaching...",
    },
  ],

  guardrails: {
    sensitiveTopics: {
      "self-harm": { action: "crisis_resources", resources: ["988 Suicide Lifeline"] },
      abuse: { action: "redirect_authorities" },
      medical: { action: "disclaimer" },
      political: { action: "decline_politely" },
    },
    theologicalGuardrails: true, // faith-specific
  },

  suggestedIntegrations: ["planning-center", "subsplash", "pushpay"],

  onboarding: {
    welcomeMessage: "Let's set up your church's AI assistant!",
    suggestedSources: [
      "Upload your beliefs statement",
      "Add your website",
      "Import sermon transcripts",
    ],
  },
};

// verticals/restaurant.ts
export const restaurantVertical = {
  id: "restaurant",
  branding: {
    name: "MenuChat",
    tagline: "AI for Restaurants",
    primaryColor: "#DC2626",
  },

  promptTemplates: [
    {
      name: "Friendly Restaurant Host",
      prompt:
        "You help customers with menu questions, hours, reservations, and dietary accommodations for {{restaurant_name}}...",
    },
  ],

  guardrails: {
    sensitiveTopics: {
      allergens: {
        action: "strong_disclaimer",
        message: "Please confirm allergen info with staff",
      },
      food_poisoning: { action: "redirect_manager" },
    },
  },

  suggestedIntegrations: ["opentable", "doordash", "yelp"],
};
```

## Data Models (Convex Schema Sketch)

> All tables include `organizationId` for multi-tenancy. Queries MUST filter by org.
> Soft delete via `deletedAt` timestamp (null = active).
> Indexes on: `organizationId`, `agentId`, `conversationId`, `slug` fields.

### organizations

```typescript
{
  _id: Id<"organizations">
  name: string                    // "First Baptist Church"
  slug: string                    // "first-baptist" (unique, for help page URL)

  // Vertical (determines templates, guardrails, integrations)
  vertical: "faith" | "restaurant" | "legal" | "realestate" | "healthcare" | "generic"

  // Security
  allowedDomains: string[]        // ["firstbaptist.org", "*.firstbaptist.org"]

  // Rate limiting (token bucket)
  rateLimitTokens: number         // current tokens available
  rateLimitLastRefill: number     // timestamp of last refill

  // Billing
  plan: "free" | "hobby" | "standard" | "pro"
  stripeCustomerId?: string
  stripeSubscriptionId?: string

  // Usage tracking
  messageCreditsUsed: number      // resets monthly
  messageCreditsLimit: number     // based on plan
  storageUsedKb: number
  storageLimitKb: number          // based on plan
  billingCycleStart: number       // timestamp

  // Settings
  defaultModel: string            // "openai/gpt-4o-mini"

  createdAt: number
  deletedAt?: number              // soft delete
}
```

### users

```typescript
{
  _id: Id<"users">
  organizationId: Id<"organizations">

  // Synced from WorkOS
  workosUserId: string            // WorkOS user ID
  email: string
  name: string
  avatarUrl?: string

  // Role managed via WorkOS RBAC or local
  role: "owner" | "admin" | "editor" | "viewer"

  createdAt: number
  lastLoginAt?: number
  deletedAt?: number              // soft delete (revoke access)
}

// WorkOS handles:
// - Authentication (email/password, Google, SSO)
// - Organization membership
// - Directory sync (SCIM) for enterprise
// - Session management
// We sync user data to Convex on login/webhook
```

### agents

```typescript
{
  _id: Id<"agents">
  organizationId: Id<"organizations">

  name: string                    // "Main Website Bot"
  slug: string                    // "main" (unique within org)

  // Chat Model Config
  model: string                   // "openai/gpt-4o-mini" or "anthropic/claude-3-haiku"
  temperature: number             // 0.0 - 1.0
  systemPrompt: string            // base instructions

  // Embedding Config (locked per agent - changing requires re-embed all sources)
  embeddingModel: string          // "openai/text-embedding-3-small"
  embeddingDimensions: number     // 1536 (must match vector index)

  // Widget appearance
  widgetConfig: {
    primaryColor: string          // "#3B82F6"
    avatarUrl?: string
    welcomeMessage: string        // "Hi! How can I help you today?"
    placeholderText: string       // "Type your message..."
    position: "bottom-right" | "bottom-left"
  }

  // Status
  status: "draft" | "active" | "paused"
  needsRetraining: boolean
  lastTrainedAt?: number

  // Versioning (increment on config change)
  version: number                 // conversations store this to reference config at time of chat

  createdAt: number
  updatedAt: number
  deletedAt?: number              // soft delete
}
```

### sources

```typescript
{
  _id: Id<"sources">
  organizationId: Id<"organizations">
  agentId: Id<"agents">

  type: "file" | "website" | "text" | "qa"
  status: "pending" | "processing" | "ready" | "failed"

  // Metadata (varies by type)
  name: string                    // filename, URL, or label
  sizeKb: number
  chunkCount?: number             // number of chunks generated

  // For files
  fileId?: Id<"_storage">         // Convex file storage
  mimeType?: string

  // For websites
  url?: string
  crawledPages?: number

  // For Q&A
  question?: string
  answer?: string

  // For text snippets
  content?: string

  // Processing
  errorMessage?: string
  workflowRunId?: string          // Vercel Workflow run ID for tracking

  // Hash for incremental retraining (skip if unchanged)
  contentHash?: string            // MD5 of content, skip re-embedding if same

  createdAt: number
  updatedAt: number
  deletedAt?: number              // soft delete
}
```

### chunks (for RAG)

```typescript
{
  _id: Id<"chunks">
  organizationId: Id<"organizations">
  agentId: Id<"agents">
  sourceId: Id<"sources">

  content: string                 // text chunk (~500 tokens)
  embedding: v.array(v.float64()) // Convex vector index

  // Track embedding model for migration/debugging
  embeddingModel: string          // "openai/text-embedding-3-small"

  // Metadata for citations
  metadata: {
    sourceType: string
    sourceName: string
    pageNumber?: number
    url?: string
    chunkIndex: number            // position in source for ordering
  }

  createdAt: number
}

// Convex vector index definition:
// chunks.by_embedding: vectorIndex("embedding")
//   .dimensions(1536)
//   .filterBy("organizationId", "agentId")  // defense in depth
```

### conversations

```typescript
{
  _id: Id<"conversations">
  organizationId: Id<"organizations">
  agentId: Id<"agents">

  // Snapshot of agent config at conversation start (for historical accuracy)
  agentVersion: number
  agentConfigSnapshot: {
    model: string
    temperature: number
    systemPrompt: string
  }

  // Visitor identification (anonymous)
  visitorId: string               // generated UUID, stored in localStorage

  // Metadata
  origin: string                  // "https://mychurch.org/about"
  userAgent: string
  ipAddress?: string              // for rate limiting, not stored long-term
  country?: string                // from IP geolocation
  city?: string

  // Analytics
  messageCount: number
  sentiment?: "positive" | "neutral" | "negative"
  topics?: string[]               // auto-categorized

  // Lead capture
  leadId?: Id<"leads">

  createdAt: number
  lastMessageAt: number
}
```

### messages

```typescript
{
  _id: Id<"messages">
  organizationId: Id<"organizations">
  conversationId: Id<"conversations">

  role: "user" | "assistant"
  content: string

  // For assistant messages - RAG context
  chunksUsed?: Id<"chunks">[]     // which chunks were retrieved
  citations?: {                   // denormalized for display
    chunkId: Id<"chunks">
    snippet: string               // relevant excerpt
    sourceName: string
    sourceType: string
    pageNumber?: number
    url?: string
  }[]

  // For assistant messages - usage tracking
  model?: string                  // which model was used
  tokensPrompt?: number
  tokensCompletion?: number
  latencyMs?: number

  // Streaming
  streamId?: string               // for persistent-text-streaming

  createdAt: number
}
```

### leads

```typescript
{
  _id: Id<"leads">
  organizationId: Id<"organizations">
  conversationId?: Id<"conversations">

  name?: string
  email?: string
  phone?: string

  // Custom fields configured by org
  customFields?: Record<string, string>

  source: "chat" | "manual"       // how lead was captured

  createdAt: number
}
```

### webhooks

```typescript
{
  _id: Id<"webhooks">
  organizationId: Id<"organizations">

  url: string
  events: ("conversation.created" | "lead.captured" | "sentiment.negative")[]
  secret: string                  // for HMAC signature

  isActive: boolean
  lastTriggeredAt?: number
  lastStatus?: number             // HTTP status code

  createdAt: number
  deletedAt?: number
}
```

### auditLogs

```typescript
{
  _id: Id<"auditLogs">
  organizationId: Id<"organizations">

  userId: Id<"users">             // who performed the action
  action: string                  // "agent.created", "source.deleted", "settings.updated"
  resourceType: string            // "agent", "source", "organization"
  resourceId: string              // ID of affected resource

  // Change details
  changes?: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
  }

  ipAddress?: string
  userAgent?: string

  createdAt: number
}
// Auto-pruned after 90 days (or based on plan)
```

### usageEvents (append-only ledger)

```typescript
{
  _id: Id<"usageEvents">
  organizationId: Id<"organizations">
  agentId?: Id<"agents">
  conversationId?: Id<"conversations">
  messageId?: Id<"messages">

  eventType: "llm_completion" | "embedding" | "scrape" | "file_parse"

  // For LLM completions
  model?: string
  tokensPrompt?: number
  tokensCompletion?: number
  latencyMs?: number

  // For embeddings
  chunksCreated?: number
  embeddingModel?: string

  // Cost tracking
  costEstimateCents?: number      // estimated cost in cents

  // Idempotency
  idempotencyKey?: string         // e.g., "source:{sourceId}:embed:{contentHash}"

  createdAt: number
}
// Never deleted - used for billing reconciliation
// Compute "credits used this month" by summing events in date range
// Roll up to daily/monthly aggregates for dashboard performance
```

### jobs (workflow tracking)

```typescript
{
  _id: Id<"jobs">
  organizationId: Id<"organizations">

  // What this job is processing
  jobType: "embed_source" | "scrape_website" | "parse_file" | "retrain_agent"
  sourceId?: Id<"sources">
  agentId?: Id<"agents">

  // Status tracking
  status: "pending" | "running" | "completed" | "failed" | "cancelled"
  attemptCount: number            // for retries
  maxAttempts: number             // default 3

  // Timing
  scheduledAt: number
  startedAt?: number
  completedAt?: number
  lastHeartbeat?: number          // detect stuck jobs (no heartbeat > 5 min)

  // Progress (optional, for UI)
  progress?: {
    current: number
    total: number
    message: string               // "Processing page 3 of 10"
  }

  // Error handling
  lastError?: string
  errorHistory?: { error: string, attemptNumber: number, timestamp: number }[]

  // Vercel Workflow integration
  workflowRunId?: string

  // Idempotency
  idempotencyKey: string          // e.g., "source:{sourceId}:{contentHash}"

  createdAt: number
}
// Allows: retry button, progress UI, stuck job detection, debugging
```
