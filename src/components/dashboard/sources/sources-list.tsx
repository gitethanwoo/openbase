"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import {
  Database,
  FileText,
  Globe,
  MessageSquare,
  Type,
  Trash2,
  Bot,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Cloud,
  NotebookText,
} from "lucide-react";
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

type SourceWithAgent = Doc<"sources"> & { agentName: string };

interface SourcesListProps {
  sources: SourceWithAgent[];
  agents: Doc<"agents">[];
  organizationId: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  file: <FileText className="h-4 w-4" />,
  website: <Globe className="h-4 w-4" />,
  text: <Type className="h-4 w-4" />,
  qa: <MessageSquare className="h-4 w-4" />,
  notion: <NotebookText className="h-4 w-4" />,
  gdrive: <Cloud className="h-4 w-4" />,
};

const typeLabels: Record<string, string> = {
  file: "File",
  website: "Website",
  text: "Text",
  qa: "Q&A",
  notion: "Notion",
  gdrive: "Google Drive",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  processing: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
  ready: <CheckCircle className="h-4 w-4 text-green-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />,
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  ready: "Ready",
  error: "Error",
};

export function SourcesList({ sources, agents, organizationId }: SourcesListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const deleteSource = useMutation(api.sources.deleteSource);

  const handleDelete = async (sourceId: Id<"sources">) => {
    setDeletingId(sourceId);
    try {
      await deleteSource({ sourceId });
      setShowDeleteConfirm(null);
    } finally {
      setDeletingId(null);
    }
  };

  const formatSize = (sizeKb?: number) => {
    if (!sizeKb) return "-";
    if (sizeKb < 1024) return `${sizeKb} KB`;
    return `${(sizeKb / 1024).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Knowledge Sources</h2>
          <p className="text-muted-foreground">
            Manage knowledge base sources across all your agents.
          </p>
        </div>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Bot className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No agents yet</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Create an agent first, then add knowledge sources to it.
            </p>
            <Link href="/dashboard/agents/new" className="mt-4">
              <Button>Create Agent</Button>
            </Link>
          </CardContent>
        </Card>
      ) : sources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Database className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No sources yet</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Add knowledge sources to your agents to improve their responses.
            </p>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              Go to an agent&apos;s settings page to add sources.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Sources</CardTitle>
            <CardDescription>
              {sources.length} source{sources.length !== 1 ? "s" : ""} across{" "}
              {new Set(sources.map((s) => s.agentId)).size} agent
              {new Set(sources.map((s) => s.agentId)).size !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {sources.map((source) => (
                <div
                  key={source._id}
                  className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      {typeIcons[source.type] || <FileText className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{source.name}</p>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {statusIcons[source.status]}
                          {statusLabels[source.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Link
                          href={`/dashboard/agents/${source.agentId}/edit`}
                          className="hover:text-foreground hover:underline"
                        >
                          {source.agentName}
                        </Link>
                        <span>·</span>
                        <span>{typeLabels[source.type] ?? source.type}</span>
                        {source.sizeKb && (
                          <>
                            <span>·</span>
                            <span>{formatSize(source.sizeKb)}</span>
                          </>
                        )}
                        {source.chunkCount && (
                          <>
                            <span>·</span>
                            <span>{source.chunkCount} chunks</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{formatDate(source.createdAt)}</span>
                      </div>
                      {source.errorMessage && (
                        <p className="mt-1 text-xs text-red-500">
                          {source.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {showDeleteConfirm === source._id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Delete?</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(source._id)}
                          disabled={deletingId === source._id}
                        >
                          {deletingId === source._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Yes"
                          )}
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
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setShowDeleteConfirm(source._id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help text */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adding Sources</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            To add new knowledge sources, go to an agent&apos;s settings page and use the
            &quot;Knowledge Base&quot; section. You can add:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <strong>Files</strong> - PDF, DOCX, or TXT documents
            </li>
            <li>
              <strong>Websites</strong> - Scrape content from URLs
            </li>
            <li>
              <strong>Text snippets</strong> - Manual text entries
            </li>
            <li>
              <strong>Q&A pairs</strong> - Question and answer pairs for specific queries
            </li>
            <li>
              <strong>Notion</strong> - Import shared pages from your workspace
            </li>
            <li>
              <strong>Google Drive</strong> - Import Docs, Sheets, PDFs, and text files
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
