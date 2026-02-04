"use client";

import { useState, useEffect } from "react";
import { Doc } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, Copy, ExternalLink, Eye, Code } from "lucide-react";
import Link from "next/link";

interface EmbedCodeGeneratorProps {
  agent: Doc<"agents">;
  baseUrl: string;
}

export function EmbedCodeGenerator({ agent, baseUrl }: EmbedCodeGeneratorProps) {
  const [copiedWidget, setCopiedWidget] = useState(false);
  const [copiedIframe, setCopiedIframe] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Load the floating widget on this page
  useEffect(() => {
    // Remove any existing widget container first
    const existingContainer = document.getElementById("cb-widget-container");
    if (existingContainer) {
      existingContainer.remove();
    }

    // Create and load the widget script
    const script = document.createElement("script");
    script.src = `${baseUrl}/widget/chat.js`;
    script.setAttribute("data-agent-id", agent._id);
    script.setAttribute("data-api-url", baseUrl);
    script.async = true;
    document.body.appendChild(script);

    // Cleanup on unmount
    return () => {
      script.remove();
      const container = document.getElementById("cb-widget-container");
      if (container) {
        container.remove();
      }
    };
  }, [agent._id, baseUrl]);

  const widgetScriptCode = `<script src="${baseUrl}/widget/chat.js" data-agent-id="${agent._id}"></script>`;

  const iframeCode = `<iframe
  src="${baseUrl}/embed/${agent._id}"
  width="400"
  height="600"
  frameborder="0"
  style="border: none; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"
></iframe>`;

  const helpPageUrl = `${baseUrl}/chat/${agent.slug}`;
  const embedUrl = `${baseUrl}/embed/${agent._id}`;

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
      {/* Test Widget Section - Most Important */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Test Your Widget
          </CardTitle>
          <CardDescription>
            The floating chat bubble is live in the bottom-right corner of this page. Click it to test your agent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setShowPreview(!showPreview)} variant={showPreview ? "default" : "outline"}>
              <Eye className="mr-2 h-4 w-4" />
              {showPreview ? "Hide Inline Preview" : "Show Inline Preview"}
            </Button>
            <Button asChild variant="outline">
              <Link href={embedUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Full Page
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/dashboard/agents/${agent._id}/playground`}>
                Test in Playground
              </Link>
            </Button>
          </div>

          {/* Live Preview */}
          {showPreview && (
            <div className="mt-4 rounded-lg border bg-muted/30 p-4">
              <p className="mb-3 text-sm text-muted-foreground">
                This is how your widget will appear to users:
              </p>
              <div className="flex justify-center">
                <iframe
                  src={embedUrl}
                  width="380"
                  height="500"
                  className="rounded-xl border shadow-lg"
                  style={{ border: "none" }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Embed Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Embed on Your Website
          </CardTitle>
          <CardDescription>
            Choose one of the methods below to add the chatbot to your website.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Method 1: Widget Script */}
          <div className="space-y-3">
            <h4 className="font-medium">Option 1: Floating Widget (Recommended)</h4>
            <p className="text-sm text-muted-foreground">
              Add this script to display a chat bubble in the corner of your website.
              Users can click it to open the chat.
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
          </div>

          <div className="border-t pt-6">
            {/* Method 2: Iframe */}
            <h4 className="font-medium">Option 2: Inline Iframe</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              Embed the chat directly into a specific section of your page.
            </p>
            <div className="relative mt-3">
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
            <p className="mt-2 text-xs text-muted-foreground">
              Adjust the width, height, and styles to fit your design.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Standalone Help Page */}
      <Card>
        <CardHeader>
          <CardTitle>Standalone Help Page</CardTitle>
          <CardDescription>
            A dedicated page for your chatbot that you can link to directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share this URL in your documentation, emails, or support pages.
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 truncate rounded-lg bg-muted px-4 py-2.5 text-sm">
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
          <CardTitle>Setup Checklist</CardTitle>
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

      {/* Navigation */}
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href={`/dashboard/agents/${agent._id}/edit`}>Back to Agent</Link>
        </Button>
      </div>
    </div>
  );
}
