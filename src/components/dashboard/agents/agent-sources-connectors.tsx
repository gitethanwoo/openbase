"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { WorkOsWidgets, Pipes } from "@workos-inc/widgets";
import { useAccessToken } from "@workos-inc/authkit-nextjs/components";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Cloud, NotebookText, RefreshCcw } from "lucide-react";

interface AgentSourcesConnectorsProps {
  agentId: string;
  organizationId: string;
  workosUserId: string;
}

type NotionPageSummary = {
  id: string;
  title: string;
  url: string;
  lastEditedTime: string;
};

type NotionListResult =
  | { status: "connected"; pages: NotionPageSummary[] }
  | { status: "not_installed" | "needs_reauthorization"; pages: [] };

type GDriveFileSummary = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  sizeKb?: number;
  webViewLink?: string;
};

type GDriveListResult =
  | { status: "connected"; files: GDriveFileSummary[] }
  | { status: "not_installed" | "needs_reauthorization"; files: [] };

function formatDate(timestamp?: string) {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AgentSourcesConnectors({
  agentId,
  organizationId,
  workosUserId,
}: AgentSourcesConnectorsProps) {
  const router = useRouter();
  const { accessToken, loading: authLoading, error: authError } = useAccessToken();

  const listNotionPages = useAction(api.integrations.listNotionPages);
  const listGDriveFiles = useAction(api.integrations.listGDriveFiles);
  const createNotionSource = useMutation(api.sources.createNotionSource);
  const createGDriveSource = useMutation(api.sources.createGDriveSource);

  const [notionResult, setNotionResult] = useState<NotionListResult | null>(null);
  const [gdriveResult, setGDriveResult] = useState<GDriveListResult | null>(null);
  const [notionLoading, setNotionLoading] = useState(false);
  const [gdriveLoading, setGDriveLoading] = useState(false);
  const [notionError, setNotionError] = useState<string | null>(null);
  const [gdriveError, setGDriveError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importingNotionId, setImportingNotionId] = useState<string | null>(null);
  const [importingGDriveId, setImportingGDriveId] = useState<string | null>(null);

  const loadNotionPages = async () => {
    setNotionLoading(true);
    setNotionError(null);
    try {
      const result = (await listNotionPages({
        limit: 50,
        workosUserId,
      })) as NotionListResult;
      setNotionResult(result);
    } catch (err) {
      setNotionError(err instanceof Error ? err.message : "Failed to load Notion pages");
    } finally {
      setNotionLoading(false);
    }
  };

  const loadGDriveFiles = async () => {
    setGDriveLoading(true);
    setGDriveError(null);
    try {
      const result = (await listGDriveFiles({
        limit: 50,
        workosUserId,
      })) as GDriveListResult;
      setGDriveResult(result);
    } catch (err) {
      setGDriveError(
        err instanceof Error ? err.message : "Failed to load Google Drive files"
      );
    } finally {
      setGDriveLoading(false);
    }
  };

  const handleImportNotion = async (page: NotionPageSummary) => {
    setImportError(null);
    setImportingNotionId(page.id);
    try {
      const lastEditedTime = new Date(page.lastEditedTime).getTime();
      const source = await createNotionSource({
        organizationId: organizationId as Id<"organizations">,
        agentId: agentId as Id<"agents">,
        pageId: page.id,
        title: page.title,
        pageUrl: page.url,
        lastEditedTime: Number.isNaN(lastEditedTime) ? undefined : lastEditedTime,
        workosUserId,
      });

      const response = await fetch("/api/import-notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: source.sourceId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to start Notion import");
      }

      router.refresh();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImportingNotionId(null);
    }
  };

  const handleImportGDrive = async (file: GDriveFileSummary) => {
    setImportError(null);
    setImportingGDriveId(file.id);
    try {
      const modifiedTime = file.modifiedTime
        ? new Date(file.modifiedTime).getTime()
        : undefined;
      const source = await createGDriveSource({
        organizationId: organizationId as Id<"organizations">,
        agentId: agentId as Id<"agents">,
        fileId: file.id,
        fileName: file.name,
        mimeType: file.mimeType,
        sizeKb: file.sizeKb,
        webViewLink: file.webViewLink,
        modifiedTime: modifiedTime && !Number.isNaN(modifiedTime) ? modifiedTime : undefined,
        workosUserId,
      });

      const response = await fetch("/api/import-gdrive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: source.sourceId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to start Drive import");
      }

      router.refresh();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImportingGDriveId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge Base</CardTitle>
        <CardDescription>
          Connect external tools and import content for this agent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="text-sm font-medium">Connected Accounts</div>
          {authLoading ? (
            <div className="text-sm text-muted-foreground">Loading access token...</div>
          ) : authError ? (
            <div className="text-sm text-destructive">{authError.message}</div>
          ) : accessToken ? (
            <div className="rounded-md border bg-background p-3">
              <WorkOsWidgets>
                <Pipes authToken={accessToken} />
              </WorkOsWidgets>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Access token unavailable. Please refresh the page.
            </div>
          )}
        </div>

        {importError && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {importError}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-md border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <NotebookText className="h-4 w-4" />
                <span className="text-sm font-semibold">Notion</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadNotionPages}
                disabled={notionLoading}
              >
                {notionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
              </Button>
            </div>

            {notionError && (
              <div className="mt-3 text-sm text-destructive">{notionError}</div>
            )}

            {notionResult?.status === "not_installed" && (
              <div className="mt-3 text-sm text-muted-foreground">
                Connect Notion above to browse pages.
              </div>
            )}

            {notionResult?.status === "needs_reauthorization" && (
              <div className="mt-3 text-sm text-muted-foreground">
                Reauthorize Notion in the widget above.
              </div>
            )}

            {notionResult?.status === "connected" && notionResult.pages.length === 0 && (
              <div className="mt-3 text-sm text-muted-foreground">
                No pages found in Notion.
              </div>
            )}

            {notionResult?.status === "connected" && notionResult.pages.length > 0 && (
              <div className="mt-4 space-y-3">
                {notionResult.pages.map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{page.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Last edited {formatDate(page.lastEditedTime)}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleImportNotion(page)}
                      disabled={importingNotionId === page.id}
                    >
                      {importingNotionId === page.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Import"
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!notionResult && !notionLoading && (
              <div className="mt-3 text-sm text-muted-foreground">
                Load pages to import from Notion.
              </div>
            )}
          </div>

          <div className="rounded-md border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                <span className="text-sm font-semibold">Google Drive</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadGDriveFiles}
                disabled={gdriveLoading}
              >
                {gdriveLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
              </Button>
            </div>

            {gdriveError && (
              <div className="mt-3 text-sm text-destructive">{gdriveError}</div>
            )}

            {gdriveResult?.status === "not_installed" && (
              <div className="mt-3 text-sm text-muted-foreground">
                Connect Google Drive above to browse files.
              </div>
            )}

            {gdriveResult?.status === "needs_reauthorization" && (
              <div className="mt-3 text-sm text-muted-foreground">
                Reauthorize Google Drive in the widget above.
              </div>
            )}

            {gdriveResult?.status === "connected" && gdriveResult.files.length === 0 && (
              <div className="mt-3 text-sm text-muted-foreground">
                No supported files found in Google Drive.
              </div>
            )}

            {gdriveResult?.status === "connected" && gdriveResult.files.length > 0 && (
              <div className="mt-4 space-y-3">
                {gdriveResult.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Modified {formatDate(file.modifiedTime)}
                        {file.sizeKb ? ` · ${file.sizeKb} KB` : ""}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleImportGDrive(file)}
                      disabled={importingGDriveId === file.id}
                    >
                      {importingGDriveId === file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Import"
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!gdriveResult && !gdriveLoading && (
              <div className="mt-3 text-sm text-muted-foreground">
                Load files to import from Google Drive.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
