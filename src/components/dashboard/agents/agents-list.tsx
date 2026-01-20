"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { Bot, Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AgentsListProps {
  agents: Doc<"agents">[];
  organizationId?: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  archived: "bg-red-100 text-red-800",
};

export function AgentsList({ agents, organizationId }: AgentsListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );
  const deleteAgent = useMutation(api.agents.deleteAgent);

  const handleDelete = async (agentId: Id<"agents">) => {
    setDeletingId(agentId);
    try {
      await deleteAgent({ agentId });
      setShowDeleteConfirm(null);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Agents</h2>
          <p className="text-muted-foreground">
            Create and manage your AI chatbot agents.
          </p>
        </div>
        {organizationId && (
          <Link href="/dashboard/agents/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Agent
            </Button>
          </Link>
        )}
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Bot className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No agents yet</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Get started by creating your first AI agent.
            </p>
            {organizationId && (
              <Link href="/dashboard/agents/new" className="mt-4">
                <Button>
                  <Plus className="h-4 w-4" />
                  Create Agent
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent._id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <CardDescription className="text-xs">
                        /{agent.slug}
                      </CardDescription>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[agent.status] || statusColors.draft}`}
                  >
                    {agent.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Model: </span>
                    <span className="font-medium">{agent.model}</span>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {agent.systemPrompt}
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <Link
                      href={`/dashboard/agents/${agent._id}/edit`}
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                    </Link>
                    {showDeleteConfirm === agent._id ? (
                      <div className="flex gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            handleDelete(agent._id as Id<"agents">)
                          }
                          disabled={deletingId === agent._id}
                        >
                          {deletingId === agent._id ? "..." : "Yes"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(null)}
                        >
                          No
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setShowDeleteConfirm(agent._id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
