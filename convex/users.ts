import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Get user by WorkOS user ID.
 */
export const getUserByWorkosId = query({
  args: {
    workosUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.workosUserId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();

    return user;
  },
});

/**
 * Get user by ID.
 */
export const getUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.deletedAt) {
      return null;
    }
    return user;
  },
});

/**
 * Get current user with their organization.
 * Returns the first organization membership if multiple exist.
 */
export const getCurrentUserWithOrg = query({
  args: {
    workosUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.workosUserId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();

    if (!user) {
      return null;
    }

    const organization = await ctx.db.get(user.organizationId);
    if (!organization || organization.deletedAt) {
      return null;
    }

    return {
      user,
      organization,
    };
  },
});

/**
 * Sync user from WorkOS on login.
 * Creates user and default organization if they don't exist.
 * Updates user info if they do exist.
 */
export const syncUserOnLogin = mutation({
  args: {
    workosUserId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    userId: Id<"users">;
    organizationId: Id<"organizations">;
    isNewUser: boolean;
  }> => {
    const now = Date.now();

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.workosUserId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();

    if (existingUser) {
      // Update existing user's info and lastLoginAt
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        avatarUrl: args.avatarUrl,
        lastLoginAt: now,
      });

      return {
        userId: existingUser._id,
        organizationId: existingUser.organizationId,
        isNewUser: false,
      };
    }

    // New user - create default organization inline to avoid circular type reference
    const orgName = args.name ? `${args.name}'s Organization` : "My Organization";
    let orgSlug = generateSlug(args.email);

    // Generate unique slug if it already exists
    let counter = 1;
    while (true) {
      const existing = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", orgSlug))
        .first();

      if (!existing) break;

      orgSlug = `${generateSlug(args.email)}-${counter}`;
      counter++;
    }

    const orgId = await ctx.db.insert("organizations", {
      name: orgName,
      slug: orgSlug,
      vertical: "faithbase", // Default vertical
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

    // Create the user with owner role
    const userId = await ctx.db.insert("users", {
      organizationId: orgId,
      workosUserId: args.workosUserId,
      email: args.email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      role: "owner",
      createdAt: now,
      lastLoginAt: now,
    });

    return {
      userId,
      organizationId: orgId,
      isNewUser: true,
    };
  },
});

/**
 * Add user to an organization (for invites, team members).
 */
export const addUserToOrganization = internalMutation({
  args: {
    workosUserId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    organizationId: v.id("organizations"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if user already in this organization
    const existingMembership = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.workosUserId))
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .first();

    if (existingMembership) {
      return existingMembership._id;
    }

    const userId = await ctx.db.insert("users", {
      organizationId: args.organizationId,
      workosUserId: args.workosUserId,
      email: args.email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      role: args.role,
      createdAt: now,
    });

    return userId;
  },
});

/**
 * Update user's last login time.
 */
export const updateLastLogin = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      lastLoginAt: Date.now(),
    });
  },
});

/**
 * Get user membership in a specific organization.
 */
export const getUserMembership = internalQuery({
  args: {
    workosUserId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.workosUserId))
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .first();
  },
});

/**
 * Generate a URL-safe slug from an email.
 */
function generateSlug(email: string): string {
  // Take the part before @ and sanitize
  const prefix = email.split("@")[0];
  return prefix
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}
