"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Plus, Trash2, GripVertical } from "lucide-react";

interface LeadCaptureField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

interface LeadCaptureConfig {
  enabled: boolean;
  triggerMode: string;
  triggerAfterMessages?: number;
  title: string;
  description?: string;
  fields: LeadCaptureField[];
  submitButtonText: string;
  successMessage: string;
}

interface AgentSettingsFormProps {
  agent: Doc<"agents">;
}

const WIDGET_POSITIONS = [
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "top-right", label: "Top Right" },
  { value: "top-left", label: "Top Left" },
];

const TRIGGER_MODES = [
  { value: "after_messages", label: "After N messages" },
  { value: "before_chat", label: "Before chat starts" },
  { value: "manual", label: "Manual (via trigger button)" },
];

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "textarea", label: "Text Area" },
  { value: "select", label: "Select Dropdown" },
];

const DEFAULT_LEAD_CAPTURE_CONFIG: LeadCaptureConfig = {
  enabled: false,
  triggerMode: "after_messages",
  triggerAfterMessages: 3,
  title: "Get in touch",
  description: "Leave your details and we'll get back to you.",
  fields: [
    { id: "name", type: "text", label: "Name", placeholder: "Your name", required: true },
    { id: "email", type: "email", label: "Email", placeholder: "your@email.com", required: true },
  ],
  submitButtonText: "Submit",
  successMessage: "Thanks! We'll be in touch soon.",
};

function generateFieldId(): string {
  return `field-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

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

  // Lead capture config state
  const [leadCaptureConfig, setLeadCaptureConfig] = useState<LeadCaptureConfig>(
    agent.leadCaptureConfig ?? DEFAULT_LEAD_CAPTURE_CONFIG
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Lead capture field handlers
  const addField = () => {
    const newField: LeadCaptureField = {
      id: generateFieldId(),
      type: "text",
      label: "New Field",
      placeholder: "",
      required: false,
    };
    setLeadCaptureConfig({
      ...leadCaptureConfig,
      fields: [...leadCaptureConfig.fields, newField],
    });
  };

  const updateField = (fieldId: string, updates: Partial<LeadCaptureField>) => {
    setLeadCaptureConfig({
      ...leadCaptureConfig,
      fields: leadCaptureConfig.fields.map((field) =>
        field.id === fieldId ? { ...field, ...updates } : field
      ),
    });
  };

  const removeField = (fieldId: string) => {
    setLeadCaptureConfig({
      ...leadCaptureConfig,
      fields: leadCaptureConfig.fields.filter((field) => field.id !== fieldId),
    });
  };

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
        leadCaptureConfig: {
          enabled: leadCaptureConfig.enabled,
          triggerMode: leadCaptureConfig.triggerMode,
          triggerAfterMessages: leadCaptureConfig.triggerAfterMessages,
          title: leadCaptureConfig.title,
          description: leadCaptureConfig.description,
          fields: leadCaptureConfig.fields,
          submitButtonText: leadCaptureConfig.submitButtonText,
          successMessage: leadCaptureConfig.successMessage,
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

      {/* Lead Capture Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Capture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="leadCaptureEnabled" className="text-sm font-medium">
                Enable Lead Capture
              </label>
              <p className="text-xs text-muted-foreground">
                Collect visitor information during conversations.
              </p>
            </div>
            <button
              type="button"
              id="leadCaptureEnabled"
              role="switch"
              aria-checked={leadCaptureConfig.enabled}
              onClick={() =>
                setLeadCaptureConfig({
                  ...leadCaptureConfig,
                  enabled: !leadCaptureConfig.enabled,
                })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                leadCaptureConfig.enabled ? "bg-primary" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  leadCaptureConfig.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {leadCaptureConfig.enabled && (
            <>
              {/* Trigger mode */}
              <div className="space-y-2">
                <label htmlFor="triggerMode" className="text-sm font-medium">
                  When to show form
                </label>
                <select
                  id="triggerMode"
                  value={leadCaptureConfig.triggerMode}
                  onChange={(e) =>
                    setLeadCaptureConfig({
                      ...leadCaptureConfig,
                      triggerMode: e.target.value,
                    })
                  }
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                >
                  {TRIGGER_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Trigger after N messages */}
              {leadCaptureConfig.triggerMode === "after_messages" && (
                <div className="space-y-2">
                  <label htmlFor="triggerAfterMessages" className="text-sm font-medium">
                    Show form after how many messages?
                  </label>
                  <Input
                    id="triggerAfterMessages"
                    type="number"
                    min={1}
                    max={20}
                    value={leadCaptureConfig.triggerAfterMessages ?? 3}
                    onChange={(e) =>
                      setLeadCaptureConfig({
                        ...leadCaptureConfig,
                        triggerAfterMessages: parseInt(e.target.value, 10) || 3,
                      })
                    }
                    className="w-24"
                  />
                </div>
              )}

              {/* Form title */}
              <div className="space-y-2">
                <label htmlFor="leadTitle" className="text-sm font-medium">
                  Form Title
                </label>
                <Input
                  id="leadTitle"
                  value={leadCaptureConfig.title}
                  onChange={(e) =>
                    setLeadCaptureConfig({
                      ...leadCaptureConfig,
                      title: e.target.value,
                    })
                  }
                  placeholder="Get in touch"
                />
              </div>

              {/* Form description */}
              <div className="space-y-2">
                <label htmlFor="leadDescription" className="text-sm font-medium">
                  Form Description (optional)
                </label>
                <Input
                  id="leadDescription"
                  value={leadCaptureConfig.description ?? ""}
                  onChange={(e) =>
                    setLeadCaptureConfig({
                      ...leadCaptureConfig,
                      description: e.target.value || undefined,
                    })
                  }
                  placeholder="Leave your details and we'll get back to you."
                />
              </div>

              {/* Form fields */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Form Fields</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addField}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Field
                  </Button>
                </div>
                <div className="space-y-3">
                  {leadCaptureConfig.fields.map((field) => (
                    <div
                      key={field.id}
                      className="flex items-start gap-2 rounded-md border p-3"
                    >
                      <div className="mt-2 cursor-grab text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground">
                              Field Type
                            </label>
                            <select
                              value={field.type}
                              onChange={(e) =>
                                updateField(field.id, { type: e.target.value })
                              }
                              className="mt-1 h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                            >
                              {FIELD_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">
                              Label
                            </label>
                            <Input
                              value={field.label}
                              onChange={(e) =>
                                updateField(field.id, { label: e.target.value })
                              }
                              className="mt-1 h-8"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground">
                              Placeholder
                            </label>
                            <Input
                              value={field.placeholder ?? ""}
                              onChange={(e) =>
                                updateField(field.id, {
                                  placeholder: e.target.value || undefined,
                                })
                              }
                              className="mt-1 h-8"
                            />
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) =>
                                  updateField(field.id, {
                                    required: e.target.checked,
                                  })
                                }
                                className="h-4 w-4 rounded border-input"
                              />
                              Required
                            </label>
                          </div>
                        </div>
                        {field.type === "select" && (
                          <div>
                            <label className="text-xs text-muted-foreground">
                              Options (comma-separated)
                            </label>
                            <Input
                              value={(field.options ?? []).join(", ")}
                              onChange={(e) =>
                                updateField(field.id, {
                                  options: e.target.value
                                    .split(",")
                                    .map((o) => o.trim())
                                    .filter(Boolean),
                                })
                              }
                              placeholder="Option 1, Option 2, Option 3"
                              className="mt-1 h-8"
                            />
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeField(field.id)}
                        disabled={leadCaptureConfig.fields.length <= 1}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit button text */}
              <div className="space-y-2">
                <label htmlFor="submitButtonText" className="text-sm font-medium">
                  Submit Button Text
                </label>
                <Input
                  id="submitButtonText"
                  value={leadCaptureConfig.submitButtonText}
                  onChange={(e) =>
                    setLeadCaptureConfig({
                      ...leadCaptureConfig,
                      submitButtonText: e.target.value,
                    })
                  }
                  placeholder="Submit"
                />
              </div>

              {/* Success message */}
              <div className="space-y-2">
                <label htmlFor="successMessage" className="text-sm font-medium">
                  Success Message
                </label>
                <Input
                  id="successMessage"
                  value={leadCaptureConfig.successMessage}
                  onChange={(e) =>
                    setLeadCaptureConfig({
                      ...leadCaptureConfig,
                      successMessage: e.target.value,
                    })
                  }
                  placeholder="Thanks! We'll be in touch soon."
                />
              </div>
            </>
          )}
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
