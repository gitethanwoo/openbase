"use client";

import { useState } from "react";
import { Doc } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Copy, ExternalLink } from "lucide-react";
import Link from "next/link";

interface EmbedCodeGeneratorProps {
  agent: Doc<"agents">;
  baseUrl: string;
}

export function EmbedCodeGenerator({ agent, baseUrl }: EmbedCodeGeneratorProps) {
  const [copiedWidget, setCopiedWidget] = useState(false);
  const [copiedIframe, setCopiedIframe] = useState(false);

  const widgetScriptCode = `<script src="${baseUrl}/widget/chat.js" data-agent-id="${agent._id}"></script>`;

  const iframeCode = `<iframe
  src="${baseUrl}/embed/${agent._id}"
  width="400"
  height="600"
  frameborder="0"
  style="border: none; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"
></iframe>`;

  const helpPageUrl = `${baseUrl}/chat/${agent.slug}`;

  const copyToClipboard = async (text: string, type: "widget" | "iframe") => {
    await navigator.clipboard.writeText(text);
    if (type === "widget") {
      setCopiedWidget(true);
      setTimeout(() => setCopiedWidget(false), 2000);
    } else {
      setCopiedIframe(true);
      setTimeout(() => setCopiedIframe(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Widget Script */}
      <Card>
        <CardHeader>
          <CardTitle>Widget Script (Recommended)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add this script tag to your website to display a floating chat
            widget. The widget will appear in the corner of the page based on
            your widget settings.
          </p>
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
              <code>{widgetScriptCode}</code>
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute right-2 top-2"
              onClick={() => copyToClipboard(widgetScriptCode, "widget")}
            >
              {copiedWidget ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Place this code just before the closing{" "}
            <code className="rounded bg-muted px-1 py-0.5">&lt;/body&gt;</code>{" "}
            tag on your website.
          </p>
        </CardContent>
      </Card>

      {/* Iframe Embed */}
      <Card>
        <CardHeader>
          <CardTitle>Iframe Embed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Alternatively, you can embed the chat interface directly in your
            page using an iframe. This gives you more control over placement and
            sizing.
          </p>
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
              <code>{iframeCode}</code>
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute right-2 top-2"
              onClick={() => copyToClipboard(iframeCode, "iframe")}
            >
              {copiedIframe ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Adjust the width, height, and styles to fit your design.
          </p>
        </CardContent>
      </Card>

      {/* Standalone Help Page */}
      <Card>
        <CardHeader>
          <CardTitle>Standalone Help Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your agent also has a dedicated help page that you can link to
            directly. This is useful for support documentation, help centers, or
            when you want users to access the full chat experience in a new tab.
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 rounded-lg bg-muted px-4 py-2.5 text-sm">
              {helpPageUrl}
            </code>
            <Button asChild variant="outline">
              <Link href={helpPageUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Open
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Important Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>
              Make sure your agent is set to <strong>Active</strong> status for
              the widget to work.
            </li>
            <li>
              Configure allowed domains in your{" "}
              <Link
                href="/dashboard/settings"
                className="text-foreground underline hover:no-underline"
              >
                organization settings
              </Link>{" "}
              to restrict where the widget can be embedded.
            </li>
            <li>
              Customize the widget appearance in the{" "}
              <Link
                href={`/dashboard/agents/${agent._id}/settings`}
                className="text-foreground underline hover:no-underline"
              >
                agent settings
              </Link>{" "}
              page.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Back to Agent */}
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href={`/dashboard/agents/${agent._id}/edit`}>Back to Agent</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/dashboard/agents/${agent._id}/playground`}>
            Test in Playground
          </Link>
        </Button>
      </div>
    </div>
  );
}
