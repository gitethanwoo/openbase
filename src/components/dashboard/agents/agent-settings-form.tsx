"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

interface AgentSettingsFormProps {
  agent: Doc<"agents">;
}

const WIDGET_POSITIONS = [
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "top-right", label: "Top Right" },
  { value: "top-left", label: "Top Left" },
];

export function AgentSettingsForm({ agent }: AgentSettingsFormProps) {
  const router = useRouter();
  const updateAgent = useMutation(api.agents.updateAgent);

  // Widget config state
  const [primaryColor, setPrimaryColor] = useState(
    agent.widgetConfig?.primaryColor ?? "#6366f1"
  );
  const [avatarUrl, setAvatarUrl] = useState(
    agent.widgetConfig?.avatarUrl ?? ""
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    agent.widgetConfig?.welcomeMessage ?? "Hi! How can I help you today?"
  );
  const [placeholderText, setPlaceholderText] = useState(
    agent.widgetConfig?.placeholderText ?? "Type your message..."
  );
  const [position, setPosition] = useState(
    agent.widgetConfig?.position ?? "bottom-right"
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowSuccess(false);

    if (!welcomeMessage.trim()) {
      setError("Welcome message is required");
      return;
    }

    if (!placeholderText.trim()) {
      setError("Placeholder text is required");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateAgent({
        agentId: agent._id as Id<"agents">,
        widgetConfig: {
          primaryColor,
          avatarUrl: avatarUrl.trim() || undefined,
          welcomeMessage: welcomeMessage.trim(),
          placeholderText: placeholderText.trim(),
          position,
        },
      });
      setShowSuccess(true);
      router.refresh();
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Success notification */}
      {showSuccess && (
        <div className="flex items-center gap-2 rounded-md bg-green-100 p-3 text-sm text-green-800">
          <Check className="h-4 w-4" />
          Settings saved successfully
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Widget Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Widget Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="primaryColor" className="text-sm font-medium">
              Primary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="primaryColor"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border border-input"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#6366f1"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The primary color used for the chat widget.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="avatarUrl" className="text-sm font-medium">
              Avatar URL (optional)
            </label>
            <Input
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
            />
            <p className="text-xs text-muted-foreground">
              URL for the agent&apos;s avatar image in the chat widget.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="welcomeMessage" className="text-sm font-medium">
              Welcome Message
            </label>
            <textarea
              id="welcomeMessage"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Hi! How can I help you today?"
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
            />
            <p className="text-xs text-muted-foreground">
              The initial message displayed when users open the chat.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="placeholderText" className="text-sm font-medium">
              Input Placeholder
            </label>
            <Input
              id="placeholderText"
              value={placeholderText}
              onChange={(e) => setPlaceholderText(e.target.value)}
              placeholder="Type your message..."
            />
            <p className="text-xs text-muted-foreground">
              Placeholder text shown in the chat input field.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="position" className="text-sm font-medium">
              Widget Position
            </label>
            <select
              id="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
            >
              {WIDGET_POSITIONS.map((pos) => (
                <option key={pos.value} value={pos.value}>
                  {pos.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Where the chat widget appears on the page.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Widget Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Widget Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/50 p-4">
            <div
              className="mx-auto max-w-xs rounded-lg shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center gap-2 p-3 text-white">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Agent avatar"
                    className="h-8 w-8 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-medium">
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium">{agent.name}</span>
              </div>
              <div className="rounded-b-lg bg-white p-3">
                <div className="mb-3 rounded-lg bg-gray-100 p-2 text-sm text-gray-800">
                  {welcomeMessage}
                </div>
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400">
                  {placeholderText}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Buttons */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Settings"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/dashboard/agents/${agent._id}/edit`)}
        >
          Back to Agent
        </Button>
      </div>
    </form>
  );
}
