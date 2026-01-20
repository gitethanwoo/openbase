"use client";

import { useState } from "react";
import { usePaginatedQuery } from "convex/react";
import {
  MessageSquare,
  User,
  Clock,
  ChevronRight,
  Bot,
  Calendar,
  Filter,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatRelativeTime, formatDateTime } from "@/lib/utils";

interface ChatLogsListProps {
  organizationId: string;
  agents: Doc<"agents">[];
}

const PAGE_SIZE = 20;

export function ChatLogsList({ organizationId, agents }: ChatLogsListProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Convert date strings to timestamps for the query
  const startTimestamp = startDate ? new Date(startDate).getTime() : undefined;
  const endTimestamp = endDate
    ? new Date(endDate + "T23:59:59").getTime()
    : undefined;

  const {
    results: conversations,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.chat.listConversations,
    {
      organizationId: organizationId as Id<"organizations">,
      agentId: selectedAgentId
        ? (selectedAgentId as Id<"agents">)
        : undefined,
      startDate: startTimestamp,
      endDate: endTimestamp,
    },
    { initialNumItems: PAGE_SIZE }
  );

  const clearFilters = () => {
    setSelectedAgentId("");
    setStartDate("");
    setEndDate("");
  };

  const hasFilters = selectedAgentId || startDate || endDate;

  // Create agent lookup map
  const agentMap = new Map(agents.map((a) => [a._id, a]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Chat Logs</h2>
          <p className="text-muted-foreground">
            View and monitor all conversations with your agents.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-base">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-2 block text-sm font-medium">Agent</label>
              <Select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
              >
                <option value="">All Agents</option>
                {agents.map((agent) => (
                  <option key={agent._id} value={agent._id}>
                    {agent.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-[180px]">
              <label className="mb-2 block text-sm font-medium">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="min-w-[180px]">
              <label className="mb-2 block text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {hasFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      {status === "LoadingFirstPage" ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading conversations...</div>
          </CardContent>
        </Card>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No conversations yet</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {hasFilters
                ? "No conversations match your filters. Try adjusting them."
                : "Conversations will appear here when visitors chat with your agents."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Table header */}
          <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 text-sm font-medium text-muted-foreground">
            <div>Visitor</div>
            <div>Agent</div>
            <div>Messages</div>
            <div>Started</div>
            <div>Last Activity</div>
          </div>

          {/* Conversation rows */}
          {conversations.map((conversation) => {
            const agent = agentMap.get(conversation.agentId);
            return (
              <Card
                key={conversation._id}
                className="hover:bg-muted/50 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 items-center">
                    {/* Visitor info */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {conversation.visitorId.slice(0, 8)}...
                        </div>
                        {conversation.origin && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {conversation.origin}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Agent */}
                    <div className="flex items-center gap-2 mt-2 md:mt-0">
                      <Bot className="h-4 w-4 text-muted-foreground md:hidden" />
                      <span className="text-sm">
                        {agent?.name ?? "Unknown Agent"}
                      </span>
                    </div>

                    {/* Message count */}
                    <div className="flex items-center gap-2 mt-2 md:mt-0">
                      <MessageSquare className="h-4 w-4 text-muted-foreground md:hidden" />
                      <span className="text-sm">
                        {conversation.messageCount}{" "}
                        {conversation.messageCount === 1
                          ? "message"
                          : "messages"}
                      </span>
                    </div>

                    {/* Created at */}
                    <div className="flex items-center gap-2 mt-2 md:mt-0">
                      <Calendar className="h-4 w-4 text-muted-foreground md:hidden" />
                      <span
                        className="text-sm text-muted-foreground"
                        title={formatDateTime(
                          new Date(conversation.createdAt)
                        )}
                      >
                        {formatRelativeTime(new Date(conversation.createdAt))}
                      </span>
                    </div>

                    {/* Last message at */}
                    <div className="flex items-center gap-2 mt-2 md:mt-0">
                      <Clock className="h-4 w-4 text-muted-foreground md:hidden" />
                      <span
                        className="text-sm text-muted-foreground"
                        title={formatDateTime(
                          new Date(conversation.lastMessageAt)
                        )}
                      >
                        {formatRelativeTime(
                          new Date(conversation.lastMessageAt)
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Topics/Sentiment badges */}
                  {(conversation.topics.length > 0 ||
                    conversation.sentiment) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {conversation.sentiment && (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium">
                          {conversation.sentiment}
                        </span>
                      )}
                      {conversation.topics.map((topic) => (
                        <span
                          key={topic}
                          className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-1 text-xs font-medium"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Load more button */}
          {status === "CanLoadMore" && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => loadMore(PAGE_SIZE)}
                className="gap-2"
              >
                Load More
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {status === "LoadingMore" && (
            <div className="flex justify-center pt-4">
              <div className="text-sm text-muted-foreground">Loading more...</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
