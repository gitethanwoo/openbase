import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

/**
 * Create a new organization.
 */
export const createOrganization = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    vertical: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if slug is already taken
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new Error("Organization slug already exists");
    }

    const now = Date.now();

    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      slug: args.slug,
      vertical: args.vertical ?? "generic",
      allowedDomains: [],
      rateLimitTokens: 100,
      rateLimitLastRefill: now,
      plan: "free",
      messageCreditsUsed: 0,
      messageCreditsLimit: 1000,
      storageUsedKb: 0,
      storageLimitKb: 100000, // 100MB
      billingCycleStart: now,
      defaultModel: "openai/gpt-4o-mini",
      createdAt: now,
    });

    return orgId;
  },
});

/**
 * Get organization by ID.
 */
export const getOrganization = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org || org.deletedAt) {
      return null;
    }
    return org;
  },
});

/**
 * Get organization by slug.
 */
export const getOrganizationBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!org || org.deletedAt) {
      return null;
    }
    return org;
  },
});

/**
 * List organizations for a user (via their memberships).
 */
export const listUserOrganizations = query({
  args: {
    workosUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find all user memberships
    const memberships = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.workosUserId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Fetch the organizations
    const orgs = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        if (!org || org.deletedAt) {
          return null;
        }
        return {
          ...org,
          userRole: membership.role,
          userId: membership._id,
        };
      })
    );

    return orgs.filter((org) => org !== null);
  },
});

/**
 * Update organization details.
 */
export const updateOrganization = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    vertical: v.optional(v.string()),
    defaultModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org || org.deletedAt) {
      throw new Error("Organization not found");
    }

    // If updating slug, check it's not taken
    if (args.slug !== undefined && args.slug !== org.slug) {
      const newSlug = args.slug;
      const existing = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", newSlug))
        .first();

      if (existing) {
        throw new Error("Organization slug already exists");
      }
    }

    const updates: Record<string, string> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.slug !== undefined) updates.slug = args.slug;
    if (args.vertical !== undefined) updates.vertical = args.vertical;
    if (args.defaultModel !== undefined) updates.defaultModel = args.defaultModel;

    await ctx.db.patch(args.organizationId, updates);

    return args.organizationId;
  },
});

/**
 * Internal mutation to create default organization for new user.
 * Called during user sync on first login.
 */
export const createDefaultOrganization = internalMutation({
  args: {
    name: v.string(),
    slug: v.string(),
    vertical: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate unique slug if it already exists
    let slug = args.slug;
    let counter = 1;

    while (true) {
      const existing = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();

      if (!existing) break;

      slug = `${args.slug}-${counter}`;
      counter++;
    }

    const now = Date.now();

    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      slug,
      vertical: args.vertical ?? "faithbase", // Default vertical
      allowedDomains: [],
      rateLimitTokens: 100,
      rateLimitLastRefill: now,
      plan: "free",
      messageCreditsUsed: 0,
      messageCreditsLimit: 1000,
      storageUsedKb: 0,
      storageLimitKb: 100000,
      billingCycleStart: now,
      defaultModel: "openai/gpt-4o-mini",
      createdAt: now,
    });

    return { orgId, slug };
  },
});
