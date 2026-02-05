"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Code, Play } from "lucide-react";

interface AgentFormProps {
  organizationId: string;
  agent?: Doc<"agents">;
}

const AVAILABLE_MODELS = [
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "openai/gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "anthropic/claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "anthropic/claude-3-opus", label: "Claude 3 Opus" },
  { value: "google/gemini-pro", label: "Gemini Pro" },
  { value: "moonshotai/kimi-k2.5", label: "Kimi K2.5" },
  { value: "qwen/qwen3-30b-a3b", label: "Qwen 3 30B A3B" },
  { value: "qwen/qwen3-235b-a22b-2507", label: "Qwen 3 235B A22B 2507" },
];

export function AgentForm({ organizationId, agent }: AgentFormProps) {
  const router = useRouter();
  const createAgent = useMutation(api.agents.createAgent);
  const updateAgent = useMutation(api.agents.updateAgent);

  const [name, setName] = useState(agent?.name ?? "");
  const [model, setModel] = useState(agent?.model ?? "openai/gpt-4o-mini");
  const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt ?? "");
  const [temperature, setTemperature] = useState(agent?.temperature ?? 0.7);
  const [status, setStatus] = useState(agent?.status ?? "draft");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!agent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!systemPrompt.trim()) {
      setError("System prompt is required");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing) {
        await updateAgent({
          agentId: agent._id as Id<"agents">,
          name: name.trim(),
          model,
          systemPrompt: systemPrompt.trim(),
          temperature,
          status,
        });
      } else {
        await createAgent({
          organizationId: organizationId as Id<"organizations">,
          name: name.trim(),
          model,
          systemPrompt: systemPrompt.trim(),
          temperature,
        });
      }
      router.push("/dashboard/agents");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Agent" : "Create New Agent"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My AI Assistant"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="model" className="text-sm font-medium">
              Model
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="systemPrompt" className="text-sm font-medium">
              System Prompt
            </label>
            <textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful assistant..."
              rows={6}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
            />
            <p className="text-xs text-muted-foreground">
              Instructions that define how your agent should behave and respond.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="temperature" className="text-sm font-medium">
              Temperature: {temperature}
            </label>
            <input
              type="range"
              id="temperature"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              min="0"
              max="1"
              step="0.1"
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>More focused</span>
              <span>More creative</span>
            </div>
          </div>

          {isEditing && (
            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create Agent"}
            </Button>
            {isEditing && (
              <>
                <Link href={`/dashboard/agents/${agent._id}/playground`}>
                  <Button type="button" variant="outline">
                    <Play className="mr-1.5 h-4 w-4" />
                    Test
                  </Button>
                </Link>
                <Link href={`/dashboard/agents/${agent._id}/embed`}>
                  <Button type="button" variant="outline">
                    <Code className="mr-1.5 h-4 w-4" />
                    Embed
                  </Button>
                </Link>
                <Link href={`/dashboard/agents/${agent._id}/settings`}>
                  <Button type="button" variant="outline">
                    <Settings className="mr-1.5 h-4 w-4" />
                    Settings
                  </Button>
                </Link>
              </>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/agents")}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
