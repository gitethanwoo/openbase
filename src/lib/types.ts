/**
 * Shared TypeScript types for the white-label AI chatbot platform.
 *
 * Note: These types are designed to be compatible with Convex's generated types.
 * When Convex generates its types (via `npx convex dev`), you can use:
 *   import type { Doc, Id } from "convex/_generated/dataModel";
 * to get the actual Convex document types.
 */

// =============================================================================
// Convex-compatible Id type (branded string for type safety)
// =============================================================================

declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

export type Id<TableName extends string> = Brand<string, TableName>;

// =============================================================================
// Vertical and Plan Types
// =============================================================================

export type Vertical = "faithbase" | "restaurant" | "legal" | "healthcare" | "ecommerce" | "generic";

export type Plan = "free" | "hobby" | "standard" | "pro";

// =============================================================================
// Widget Config Type
// =============================================================================

export type WidgetPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";

export interface WidgetConfig {
  primaryColor: string;
  avatarUrl?: string;
  welcomeMessage: string;
  placeholderText: string;
  position: WidgetPosition;
}

// =============================================================================
// Lead Capture Config Types
// =============================================================================

export type LeadCaptureFieldType = "text" | "email" | "phone" | "textarea" | "select";

export type LeadCaptureTriggerMode = "after_messages" | "before_chat" | "manual";

export interface LeadCaptureField {
  id: string;
  type: LeadCaptureFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select fields
}

export interface LeadCaptureConfig {
  enabled: boolean;
  triggerMode: LeadCaptureTriggerMode;
  triggerAfterMessages?: number;
  title: string;
  description?: string;
  fields: LeadCaptureField[];
  submitButtonText: string;
  successMessage: string;
}

// =============================================================================
// Error Codes
// =============================================================================

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  INVALID_TOKEN = "INVALID_TOKEN",

  // Resource errors
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  CONFLICT = "CONFLICT",

  // Validation errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",

  // Rate limiting & quotas
  RATE_LIMITED = "RATE_LIMITED",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  MESSAGE_LIMIT_EXCEEDED = "MESSAGE_LIMIT_EXCEEDED",
  STORAGE_LIMIT_EXCEEDED = "STORAGE_LIMIT_EXCEEDED",

  // Processing errors
  PROCESSING_ERROR = "PROCESSING_ERROR",
  EMBEDDING_ERROR = "EMBEDDING_ERROR",
  LLM_ERROR = "LLM_ERROR",
  SCRAPING_ERROR = "SCRAPING_ERROR",
  FILE_PARSING_ERROR = "FILE_PARSING_ERROR",

  // External service errors
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  WEBHOOK_DELIVERY_FAILED = "WEBHOOK_DELIVERY_FAILED",
  PAYMENT_ERROR = "PAYMENT_ERROR",

  // Server errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  TIMEOUT = "TIMEOUT",
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// =============================================================================
// Pagination Types
// =============================================================================

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface PaginatedApiResponse<T> extends ApiSuccessResponse<PaginatedResponse<T>> {
  success: true;
}

// =============================================================================
// Status Types (derived from schema string fields)
// =============================================================================

export type AgentStatus = "draft" | "active" | "paused" | "archived";

export type SourceStatus = "pending" | "processing" | "ready" | "error";

export type SourceType = "file" | "url" | "sitemap" | "faq" | "text";

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type JobType = "file_parse" | "url_scrape" | "sitemap_crawl" | "embedding_generate" | "agent_retrain";

export type MessageRole = "user" | "assistant" | "system";

export type Sentiment = "positive" | "neutral" | "negative";

export type UserRole = "owner" | "admin" | "member" | "viewer";

export type WebhookEvent =
  | "conversation.started"
  | "conversation.ended"
  | "message.created"
  | "lead.captured"
  | "agent.updated"
  | "source.ready"
  | "source.error";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "invite"
  | "revoke"
  | "export";

export type AuditResourceType =
  | "organization"
  | "user"
  | "agent"
  | "source"
  | "conversation"
  | "lead"
  | "webhook"
  | "settings";

export type UsageEventType =
  | "message_sent"
  | "message_received"
  | "embedding_created"
  | "source_processed"
  | "api_call";

// =============================================================================
// Citation Type (from messages schema)
// =============================================================================

export interface Citation {
  chunkId: Id<"chunks">;
  sourceId: Id<"sources">;
  sourceName: string;
  sourceType: string;
  url?: string;
  pageNumber?: number;
}

// =============================================================================
// Chunk Metadata Type (from chunks schema)
// =============================================================================

export interface ChunkMetadata {
  sourceType: string;
  sourceName: string;
  pageNumber?: number;
  url?: string;
  chunkIndex: number;
}

// =============================================================================
// Agent Config Snapshot Type (from conversations schema)
// =============================================================================

export interface AgentConfigSnapshot {
  name: string;
  model: string;
  temperature: number;
  systemPrompt: string;
}

// =============================================================================
// Document Types (mirrors Convex schema for client-side use)
// =============================================================================

export interface Organization {
  _id: Id<"organizations">;
  _creationTime: number;
  name: string;
  slug: string;
  vertical: Vertical;
  allowedDomains: string[];
  rateLimitTokens: number;
  rateLimitLastRefill: number;
  plan: Plan;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  messageCreditsUsed: number;
  messageCreditsLimit: number;
  storageUsedKb: number;
  storageLimitKb: number;
  agentCount?: number;
  agentLimit?: number;
  billingCycleStart: number;
  defaultModel: string;
  createdAt: number;
  deletedAt?: number;
}

export interface User {
  _id: Id<"users">;
  _creationTime: number;
  organizationId: Id<"organizations">;
  workosUserId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: number;
  lastLoginAt?: number;
  deletedAt?: number;
}

export interface Agent {
  _id: Id<"agents">;
  _creationTime: number;
  organizationId: Id<"organizations">;
  name: string;
  slug: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  embeddingModel: string;
  embeddingDimensions: number;
  widgetConfig: WidgetConfig;
  leadCaptureConfig?: LeadCaptureConfig;
  status: AgentStatus;
  needsRetraining: boolean;
  lastTrainedAt?: number;
  version: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface Source {
  _id: Id<"sources">;
  _creationTime: number;
  organizationId: Id<"organizations">;
  agentId: Id<"agents">;
  type: SourceType;
  status: SourceStatus;
  name: string;
  sizeKb?: number;
  chunkCount?: number;
  fileId?: Id<"_storage">;
  mimeType?: string;
  url?: string;
  crawledPages?: number;
  question?: string;
  answer?: string;
  content?: string;
  errorMessage?: string;
  workflowRunId?: string;
  contentHash?: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface Chunk {
  _id: Id<"chunks">;
  _creationTime: number;
  organizationId: Id<"organizations">;
  agentId: Id<"agents">;
  sourceId: Id<"sources">;
  content: string;
  embedding: number[];
  embeddingModel: string;
  metadata: ChunkMetadata;
  createdAt: number;
}

export interface Conversation {
  _id: Id<"conversations">;
  _creationTime: number;
  organizationId: Id<"organizations">;
  agentId: Id<"agents">;
  agentVersion: number;
  agentConfigSnapshot: AgentConfigSnapshot;
  visitorId: string;
  origin?: string;
  userAgent?: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  messageCount: number;
  sentiment?: Sentiment;
  topics: string[];
  leadId?: Id<"leads">;
  createdAt: number;
  lastMessageAt: number;
}

export interface Message {
  _id: Id<"messages">;
  _creationTime: number;
  organizationId: Id<"organizations">;
  conversationId: Id<"conversations">;
  role: MessageRole;
  content: string;
  chunksUsed?: Id<"chunks">[];
  citations?: Citation[];
  model?: string;
  tokensPrompt?: number;
  tokensCompletion?: number;
  latencyMs?: number;
  streamId?: string;
  createdAt: number;
}

export interface Lead {
  _id: Id<"leads">;
  _creationTime: number;
  organizationId: Id<"organizations">;
  agentId: Id<"agents">;
  conversationId?: Id<"conversations">;
  name?: string;
  email?: string;
  phone?: string;
  customFields?: Record<string, string>;
  source: string;
  createdAt: number;
}

export interface Webhook {
  _id: Id<"webhooks">;
  _creationTime: number;
  organizationId: Id<"organizations">;
  url: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  lastTriggeredAt?: number;
  lastStatus?: number;
  createdAt: number;
  deletedAt?: number;
}

export interface AuditLog {
  _id: Id<"auditLogs">;
  _creationTime: number;
  organizationId: Id<"organizations">;
  userId?: Id<"users">;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: number;
}

export interface UsageEvent {
  _id: Id<"usageEvents">;
  _creationTime: number;
  organizationId: Id<"organizations">;
  agentId?: Id<"agents">;
  conversationId?: Id<"conversations">;
  messageId?: Id<"messages">;
  eventType: UsageEventType;
  model?: string;
  tokensPrompt?: number;
  tokensCompletion?: number;
  latencyMs?: number;
  chunksCreated?: number;
  embeddingModel?: string;
  costEstimateCents?: number;
  idempotencyKey?: string;
  createdAt: number;
}

export interface Job {
  _id: Id<"jobs">;
  _creationTime: number;
  organizationId: Id<"organizations">;
  jobType: JobType;
  sourceId?: Id<"sources">;
  agentId?: Id<"agents">;
  status: JobStatus;
  attemptCount: number;
  maxAttempts: number;
  scheduledAt: number;
  startedAt?: number;
  completedAt?: number;
  lastHeartbeat?: number;
  progress?: number;
  lastError?: string;
  errorHistory?: string[];
  workflowRunId?: string;
  idempotencyKey?: string;
  createdAt: number;
}

// =============================================================================
// Helper type guards
// =============================================================================

export function isApiError(response: ApiResponse<unknown>): response is ApiErrorResponse {
  return !response.success;
}

export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success;
}
