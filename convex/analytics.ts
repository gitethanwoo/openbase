import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Get analytics summary for an organization within a date range.
 * Returns total conversations, total messages, and daily breakdown.
 */
export const getAnalyticsSummary = query({
  args: {
    organizationId: v.id("organizations"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    // Fetch all conversations within the date range
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_organizationId_agentId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), args.startDate),
          q.lte(q.field("createdAt"), args.endDate)
        )
      )
      .collect();

    // Calculate totals
    const totalConversations = conversations.length;
    const totalMessages = conversations.reduce(
      (sum, conv) => sum + conv.messageCount,
      0
    );

    // Group by date for the chart
    const conversationsByDate: Record<string, number> = {};
    const messagesByDate: Record<string, number> = {};

    for (const conv of conversations) {
      const dateStr = new Date(conv.createdAt).toISOString().split("T")[0];
      conversationsByDate[dateStr] = (conversationsByDate[dateStr] || 0) + 1;
      messagesByDate[dateStr] =
        (messagesByDate[dateStr] || 0) + conv.messageCount;
    }

    // Generate all dates in range for consistent chart data
    const dailyData: Array<{
      date: string;
      conversations: number;
      messages: number;
    }> = [];

    const startDateObj = new Date(args.startDate);
    const endDateObj = new Date(args.endDate);

    // Iterate through each day in the range
    const currentDate = new Date(startDateObj);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= endDateObj) {
      const dateStr = currentDate.toISOString().split("T")[0];
      dailyData.push({
        date: dateStr,
        conversations: conversationsByDate[dateStr] || 0,
        messages: messagesByDate[dateStr] || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      totalConversations,
      totalMessages,
      dailyData,
    };
  },
});
