import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Get an agent by ID.
 */
export const getAgent = query({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.deletedAt) {
      return null;
    }
    return agent;
  },
});
