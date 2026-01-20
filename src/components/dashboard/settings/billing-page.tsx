"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Doc } from "../../../../convex/_generated/dataModel";
import { PLAN_CONFIG } from "@/lib/stripe";
import type { Plan } from "@/lib/types";
import { PricingCard } from "./pricing-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, AlertCircle } from "lucide-react";

interface BillingPageProps {
  organization: Doc<"organizations">;
}

const PLAN_FEATURES: Record<Plan, string[]> = {
  free: [
    "1 chatbot agent",
    "Basic analytics",
    "Community support",
    "Standard response time",
  ],
  hobby: [
    "3 chatbot agents",
    "Advanced analytics",
    "Email support",
    "Faster response time",
    "Custom branding",
  ],
  standard: [
    "10 chatbot agents",
    "Full analytics suite",
    "Priority email support",
    "Fast response time",
    "Custom branding",
    "API access",
    "Webhook integrations",
  ],
  pro: [
    "Unlimited agents",
    "Enterprise analytics",
    "24/7 priority support",
    "Fastest response time",
    "White-label branding",
    "Full API access",
    "Advanced integrations",
    "Dedicated account manager",
  ],
};

const PLAN_ORDER: Plan[] = ["free", "hobby", "standard", "pro"];

export function BillingPage({ organization }: BillingPageProps) {
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const cancelled = searchParams.get("cancelled") === "true";
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const handleManageBilling = async () => {
    if (!organization.stripeCustomerId) return;

    setIsLoadingPortal(true);
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: organization._id,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to open billing portal:", error);
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const currentPlan = organization.plan as Plan;
  const usagePercent = Math.round(
    (organization.messageCreditsUsed / organization.messageCreditsLimit) * 100
  );
  const storagePercent = Math.round(
    (organization.storageUsedKb / organization.storageLimitKb) * 100
  );
  const agentPercent = organization.agentLimit === -1
    ? 0
    : Math.round((organization.agentCount / organization.agentLimit) * 100);

  return (
    <div className="space-y-8">
      {/* Success/Cancel notifications */}
      {success && (
        <div className="flex items-center gap-2 rounded-md bg-green-100 p-4 text-green-800">
          <Check className="h-5 w-5" />
          <div>
            <p className="font-medium">Subscription activated!</p>
            <p className="text-sm">Your plan has been upgraded successfully.</p>
          </div>
        </div>
      )}

      {cancelled && (
        <div className="flex items-center gap-2 rounded-md bg-yellow-100 p-4 text-yellow-800">
          <AlertCircle className="h-5 w-5" />
          <div>
            <p className="font-medium">Checkout cancelled</p>
            <p className="text-sm">You can upgrade anytime from this page.</p>
          </div>
        </div>
      )}

      {/* Current Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Current Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Message Credits</span>
                <span className="font-medium">
                  {organization.messageCreditsUsed.toLocaleString()} /{" "}
                  {organization.messageCreditsLimit.toLocaleString()}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {usagePercent}% used this billing cycle
              </p>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Storage</span>
                <span className="font-medium">
                  {(organization.storageUsedKb / 1024).toFixed(1)} MB /{" "}
                  {(organization.storageLimitKb / 1024).toFixed(0)} MB
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(storagePercent, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {storagePercent}% used
              </p>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Agents</span>
                <span className="font-medium">
                  {organization.agentCount} /{" "}
                  {organization.agentLimit === -1
                    ? "Unlimited"
                    : organization.agentLimit}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width:
                      organization.agentLimit === -1
                        ? "0%"
                        : `${Math.min(agentPercent, 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {organization.agentLimit === -1
                  ? "Unlimited agents"
                  : `${agentPercent}% used`}
              </p>
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Current plan:{" "}
              <span className="font-medium capitalize text-foreground">
                {PLAN_CONFIG[currentPlan].name}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Plan Tiers */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Choose Your Plan</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((plan) => {
            const config = PLAN_CONFIG[plan];
            return (
              <PricingCard
                key={plan}
                plan={plan}
                name={config.name}
                priceMonthly={config.priceMonthly}
                messageCredits={config.messageCreditsLimit}
                storageMb={config.storageLimitKb / 1024}
                features={PLAN_FEATURES[plan]}
                isCurrentPlan={currentPlan === plan}
                isPopular={plan === "standard"}
                organizationId={organization._id}
                hasStripeCustomer={!!organization.stripeCustomerId}
                isManagingBilling={isLoadingPortal}
                onManageBilling={handleManageBilling}
              />
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium">What happens when I upgrade?</h4>
            <p className="text-sm text-muted-foreground">
              Your new limits take effect immediately. You&apos;ll be charged a
              prorated amount for the remainder of your billing cycle.
            </p>
          </div>
          <div>
            <h4 className="font-medium">Can I downgrade my plan?</h4>
            <p className="text-sm text-muted-foreground">
              Yes, you can manage your subscription through the billing portal.
              Changes take effect at the end of your current billing cycle.
            </p>
          </div>
          <div>
            <h4 className="font-medium">What counts as a message credit?</h4>
            <p className="text-sm text-muted-foreground">
              Each message sent to your chatbot agents counts as one credit.
              Credits reset monthly on your billing date.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
