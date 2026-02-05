import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

/**
 * Job status values
 */
export const JOB_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

/**
 * Job type values
 */
export const JOB_TYPE = {
  FILE_PROCESSING: "file_processing",
  WEB_SCRAPING: "web_scraping",
  TEXT_SNIPPET: "text_snippet",
  QA_PAIR: "qa_pair",
  NOTION_IMPORT: "notion_import",
  GDRIVE_IMPORT: "gdrive_import",
} as const;

export type JobType = (typeof JOB_TYPE)[keyof typeof JOB_TYPE];

/**
 * Default configuration
 */
const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * Create a new job for tracking an ingestion task.
 */
export const createJob = mutation({
  args: {
    organizationId: v.id("organizations"),
    jobType: v.string(),
    sourceId: v.optional(v.id("sources")),
    agentId: v.optional(v.id("agents")),
    maxAttempts: v.optional(v.number()),
    workflowRunId: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate job via idempotency key
    if (args.idempotencyKey) {
      const existing = await ctx.db
        .query("jobs")
        .filter((q) => q.eq(q.field("idempotencyKey"), args.idempotencyKey))
        .first();
      if (existing) {
        return { jobId: existing._id, alreadyExists: true };
      }
    }

    const now = Date.now();

    const jobId = await ctx.db.insert("jobs", {
      organizationId: args.organizationId,
      jobType: args.jobType,
      sourceId: args.sourceId,
      agentId: args.agentId,
      status: JOB_STATUS.PENDING,
      attemptCount: 0,
      maxAttempts: args.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      scheduledAt: now,
      workflowRunId: args.workflowRunId,
      idempotencyKey: args.idempotencyKey,
      createdAt: now,
    });

    return { jobId, alreadyExists: false };
  },
});

/**
 * Internal mutation for creating jobs (used by actions/workflows).
 */
export const createJobInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    jobType: v.string(),
    sourceId: v.optional(v.id("sources")),
    agentId: v.optional(v.id("agents")),
    maxAttempts: v.optional(v.number()),
    workflowRunId: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate job via idempotency key
    if (args.idempotencyKey) {
      const existing = await ctx.db
        .query("jobs")
        .filter((q) => q.eq(q.field("idempotencyKey"), args.idempotencyKey))
        .first();
      if (existing) {
        return { jobId: existing._id, alreadyExists: true };
      }
    }

    const now = Date.now();

    const jobId = await ctx.db.insert("jobs", {
      organizationId: args.organizationId,
      jobType: args.jobType,
      sourceId: args.sourceId,
      agentId: args.agentId,
      status: JOB_STATUS.PENDING,
      attemptCount: 0,
      maxAttempts: args.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      scheduledAt: now,
      workflowRunId: args.workflowRunId,
      idempotencyKey: args.idempotencyKey,
      createdAt: now,
    });

    return { jobId, alreadyExists: false };
  },
});

/**
 * Start processing a job. Updates status to processing and increments attempt count.
 */
export const startJob = mutation({
  args: {
    jobId: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    const now = Date.now();

    await ctx.db.patch(args.jobId, {
      status: JOB_STATUS.PROCESSING,
      attemptCount: job.attemptCount + 1,
      startedAt: now,
      lastHeartbeat: now,
      progress: 0,
    });

    return { attemptCount: job.attemptCount + 1 };
  },
});

/**
 * Internal mutation to start a job (used by actions/workflows).
 */
export const startJobInternal = internalMutation({
  args: {
    jobId: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    const now = Date.now();

    await ctx.db.patch(args.jobId, {
      status: JOB_STATUS.PROCESSING,
      attemptCount: job.attemptCount + 1,
      startedAt: now,
      lastHeartbeat: now,
      progress: 0,
    });

    return { attemptCount: job.attemptCount + 1 };
  },
});

/**
 * Update job progress percentage (0-100).
 */
export const updateJobProgress = mutation({
  args: {
    jobId: v.id("jobs"),
    progress: v.number(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    // Clamp progress between 0 and 100
    const progress = Math.max(0, Math.min(100, args.progress));

    await ctx.db.patch(args.jobId, {
      progress,
      lastHeartbeat: Date.now(),
    });
  },
});

/**
 * Internal mutation to update job progress (used by actions/workflows).
 */
export const updateJobProgressInternal = internalMutation({
  args: {
    jobId: v.id("jobs"),
    progress: v.number(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    // Clamp progress between 0 and 100
    const progress = Math.max(0, Math.min(100, args.progress));

    await ctx.db.patch(args.jobId, {
      progress,
      lastHeartbeat: Date.now(),
    });
  },
});

/**
 * Mark a job as completed.
 */
export const completeJob = mutation({
  args: {
    jobId: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    await ctx.db.patch(args.jobId, {
      status: JOB_STATUS.COMPLETED,
      progress: 100,
      completedAt: Date.now(),
      lastHeartbeat: Date.now(),
    });
  },
});

/**
 * Internal mutation to complete a job (used by actions/workflows).
 */
export const completeJobInternal = internalMutation({
  args: {
    jobId: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    await ctx.db.patch(args.jobId, {
      status: JOB_STATUS.COMPLETED,
      progress: 100,
      completedAt: Date.now(),
      lastHeartbeat: Date.now(),
    });
  },
});

/**
 * Mark a job as failed. Tracks error history and determines if retry is possible.
 * Returns whether the job should be retried based on attemptCount < maxAttempts.
 */
export const failJob = mutation({
  args: {
    jobId: v.id("jobs"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    // Add error to history
    const errorHistory = job.errorHistory ?? [];
    errorHistory.push(`[${new Date().toISOString()}] ${args.errorMessage}`);

    const canRetry = job.attemptCount < job.maxAttempts;

    await ctx.db.patch(args.jobId, {
      status: canRetry ? JOB_STATUS.PENDING : JOB_STATUS.FAILED,
      lastError: args.errorMessage,
      errorHistory,
      lastHeartbeat: Date.now(),
      completedAt: canRetry ? undefined : Date.now(),
    });

    return {
      canRetry,
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
    };
  },
});

/**
 * Internal mutation to fail a job (used by actions/workflows).
 */
export const failJobInternal = internalMutation({
  args: {
    jobId: v.id("jobs"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    // Add error to history
    const errorHistory = job.errorHistory ?? [];
    errorHistory.push(`[${new Date().toISOString()}] ${args.errorMessage}`);

    const canRetry = job.attemptCount < job.maxAttempts;

    await ctx.db.patch(args.jobId, {
      status: canRetry ? JOB_STATUS.PENDING : JOB_STATUS.FAILED,
      lastError: args.errorMessage,
      errorHistory,
      lastHeartbeat: Date.now(),
      completedAt: canRetry ? undefined : Date.now(),
    });

    return {
      canRetry,
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
    };
  },
});

/**
 * Update the workflow run ID for a job (used when the workflow starts).
 */
export const setWorkflowRunId = mutation({
  args: {
    jobId: v.id("jobs"),
    workflowRunId: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    await ctx.db.patch(args.jobId, {
      workflowRunId: args.workflowRunId,
    });
  },
});

/**
 * Internal mutation to set workflow run ID (used by actions/workflows).
 */
export const setWorkflowRunIdInternal = internalMutation({
  args: {
    jobId: v.id("jobs"),
    workflowRunId: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    await ctx.db.patch(args.jobId, {
      workflowRunId: args.workflowRunId,
    });
  },
});

/**
 * Get a job by ID.
 */
export const getJob = query({
  args: {
    jobId: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

/**
 * Get a job by source ID.
 */
export const getJobBySource = query({
  args: {
    sourceId: v.id("sources"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("jobs")
      .filter((q) => q.eq(q.field("sourceId"), args.sourceId))
      .order("desc")
      .first();
  },
});

/**
 * List jobs for an organization.
 */
export const listJobs = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let jobsQuery;
    if (args.status) {
      jobsQuery = ctx.db
        .query("jobs")
        .withIndex("by_organizationId_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", args.status!)
        );
    } else {
      jobsQuery = ctx.db
        .query("jobs")
        .withIndex("by_organizationId", (q) =>
          q.eq("organizationId", args.organizationId)
        );
    }

    return await jobsQuery.order("desc").take(limit);
  },
});

/**
 * Get job statistics for an organization.
 */
export const getJobStats = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const stats = {
      total: jobs.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    for (const job of jobs) {
      switch (job.status) {
        case JOB_STATUS.PENDING:
          stats.pending++;
          break;
        case JOB_STATUS.PROCESSING:
          stats.processing++;
          break;
        case JOB_STATUS.COMPLETED:
          stats.completed++;
          break;
        case JOB_STATUS.FAILED:
          stats.failed++;
          break;
      }
    }

    return stats;
  },
});
