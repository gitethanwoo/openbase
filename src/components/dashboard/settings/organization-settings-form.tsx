"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Plus } from "lucide-react";

interface OrganizationSettingsFormProps {
  organization: Doc<"organizations">;
}

const AVAILABLE_MODELS = [
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "openai/gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "anthropic/claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "anthropic/claude-3-opus", label: "Claude 3 Opus" },
  { value: "google/gemini-pro", label: "Gemini Pro" },
];

const VERTICALS = [
  { value: "faithbase", label: "FaithBase (Churches)" },
  { value: "restaurant", label: "Restaurant" },
  { value: "legal", label: "Legal" },
  { value: "healthcare", label: "Healthcare" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "generic", label: "Generic" },
];

export function OrganizationSettingsForm({
  organization,
}: OrganizationSettingsFormProps) {
  const router = useRouter();
  const updateOrganization = useMutation(api.organizations.updateOrganization);

  // Organization state
  const [name, setName] = useState(organization.name);
  const [vertical, setVertical] = useState(organization.vertical);
  const [defaultModel, setDefaultModel] = useState(organization.defaultModel);
  const [allowedDomains, setAllowedDomains] = useState<string[]>(
    organization.allowedDomains ?? []
  );
  const [newDomain, setNewDomain] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAddDomain = () => {
    const domain = newDomain.trim().toLowerCase();
    if (!domain) return;

    // Basic domain validation
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;
    if (!domainRegex.test(domain)) {
      setError("Please enter a valid domain (e.g., example.com)");
      return;
    }

    if (allowedDomains.includes(domain)) {
      setError("Domain already added");
      return;
    }

    setAllowedDomains([...allowedDomains, domain]);
    setNewDomain("");
    setError(null);
  };

  const handleRemoveDomain = (domain: string) => {
    setAllowedDomains(allowedDomains.filter((d) => d !== domain));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddDomain();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowSuccess(false);

    if (!name.trim()) {
      setError("Organization name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateOrganization({
        organizationId: organization._id as Id<"organizations">,
        name: name.trim(),
        vertical,
        defaultModel,
        allowedDomains,
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

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Organization Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Organization"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="vertical" className="text-sm font-medium">
              Vertical / Industry
            </label>
            <select
              id="vertical"
              value={vertical}
              onChange={(e) => setVertical(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
            >
              {VERTICALS.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Choose the industry vertical for customized templates and
              features.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Default Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="defaultModel" className="text-sm font-medium">
              Default Model
            </label>
            <select
              id="defaultModel"
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              The default AI model for new agents in this organization.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Allowed Domains */}
      <Card>
        <CardHeader>
          <CardTitle>Allowed Domains</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Restrict which domains can embed your chat widgets. Leave empty to
            allow all domains.
          </p>

          <div className="flex gap-2">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="example.com"
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={handleAddDomain}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {allowedDomains.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allowedDomains.map((domain) => (
                <div
                  key={domain}
                  className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
                >
                  <span>{domain}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDomain(domain)}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove {domain}</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {allowedDomains.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No domain restrictions - widgets can be embedded on any website.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Organization Info (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Slug:</span>
              <span className="ml-2 font-mono">{organization.slug}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Plan:</span>
              <span className="ml-2 capitalize">{organization.plan}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Message Credits:</span>
              <span className="ml-2">
                {organization.messageCreditsUsed.toLocaleString()} /{" "}
                {organization.messageCreditsLimit.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Storage:</span>
              <span className="ml-2">
                {(organization.storageUsedKb / 1024).toFixed(1)} MB /{" "}
                {(organization.storageLimitKb / 1024).toFixed(0)} MB
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </form>
  );
}
