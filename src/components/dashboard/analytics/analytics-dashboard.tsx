"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { MessageSquare, MessagesSquare, Calendar, TrendingUp } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConversationsChart } from "./conversations-chart";

interface AnalyticsDashboardProps {
  organizationId: string;
}

type DateRangePreset = "7d" | "30d" | "90d" | "custom";

function getDateRange(preset: DateRangePreset): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (preset) {
    case "7d":
      start.setDate(start.getDate() - 6);
      break;
    case "30d":
      start.setDate(start.getDate() - 29);
      break;
    case "90d":
      start.setDate(start.getDate() - 89);
      break;
    default:
      start.setDate(start.getDate() - 6);
  }

  return { start, end };
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function AnalyticsDashboard({
  organizationId,
}: AnalyticsDashboardProps) {
  const [preset, setPreset] = useState<DateRangePreset>("7d");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const dateRange = useMemo(() => {
    if (preset === "custom" && customStartDate && customEndDate) {
      return {
        start: new Date(customStartDate),
        end: new Date(customEndDate + "T23:59:59"),
      };
    }
    return getDateRange(preset);
  }, [preset, customStartDate, customEndDate]);

  const analytics = useQuery(api.analytics.getAnalyticsSummary, {
    organizationId: organizationId as Id<"organizations">,
    startDate: dateRange.start.getTime(),
    endDate: dateRange.end.getTime(),
  });

  const handlePresetChange = (newPreset: DateRangePreset) => {
    setPreset(newPreset);
    if (newPreset !== "custom") {
      setCustomStartDate("");
      setCustomEndDate("");
    }
  };

  const handleCustomDateChange = (
    type: "start" | "end",
    value: string
  ) => {
    if (type === "start") {
      setCustomStartDate(value);
    } else {
      setCustomEndDate(value);
    }
    setPreset("custom");
  };

  const isLoading = analytics === undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Monitor your chatbot performance and engagement.
          </p>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <CardTitle className="text-base">Date Range</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex gap-2">
              <Button
                variant={preset === "7d" ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetChange("7d")}
              >
                Last 7 days
              </Button>
              <Button
                variant={preset === "30d" ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetChange("30d")}
              >
                Last 30 days
              </Button>
              <Button
                variant={preset === "90d" ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetChange("90d")}
              >
                Last 90 days
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">or</span>
              <Input
                type="date"
                value={customStartDate || formatDateForInput(dateRange.start)}
                onChange={(e) => handleCustomDateChange("start", e.target.value)}
                className="w-[150px]"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={customEndDate || formatDateForInput(dateRange.end)}
                onChange={(e) => handleCustomDateChange("end", e.target.value)}
                className="w-[150px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Total Conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-9 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-3xl font-bold">
                {analytics.totalConversations.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MessagesSquare className="h-4 w-4" />
              Total Messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-9 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-3xl font-bold">
                {analytics.totalMessages.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg. Messages per Conversation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-9 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-3xl font-bold">
                {analytics.totalConversations > 0
                  ? (
                      analytics.totalMessages / analytics.totalConversations
                    ).toFixed(1)
                  : "0"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversations Over Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Conversations Over Time</CardTitle>
          <CardDescription>
            Daily breakdown of conversations and messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-[300px] items-center justify-center">
              <div className="text-muted-foreground">Loading chart...</div>
            </div>
          ) : analytics.dailyData.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-2">No data for selected period</p>
              </div>
            </div>
          ) : (
            <ConversationsChart data={analytics.dailyData} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
