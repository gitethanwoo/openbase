"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UsageStatsProps {
  organizationId: Id<"organizations">;
}

export function UsageStats({ organizationId }: UsageStatsProps) {
  const usageSummary = useQuery(api.usage.getUsageSummary, { organizationId });

  if (!usageSummary) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Loading...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">-</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Agents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{usageSummary.agentCount}</p>
          <p className="text-xs text-muted-foreground">
            {usageSummary.agentLimit === -1
              ? "Unlimited"
              : `of ${usageSummary.agentLimit} allowed`}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Chat Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{usageSummary.totalConversations}</p>
          <p className="text-xs text-muted-foreground">Total conversations</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{usageSummary.totalSources}</p>
          <p className="text-xs text-muted-foreground">Knowledge sources</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Messages Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{usageSummary.messagesToday}</p>
          <p className="text-xs text-muted-foreground">
            {usageSummary.messageCreditsUsed.toLocaleString()} credits used
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
