"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Plan } from "@/lib/types";

interface PricingCardProps {
  plan: Plan;
  name: string;
  priceMonthly: number;
  messageCredits: number;
  storageMb: number;
  features: string[];
  isCurrentPlan: boolean;
  isPopular?: boolean;
  organizationId: string;
  hasStripeCustomer: boolean;
  isManagingBilling?: boolean;
  onManageBilling: () => void;
}

export function PricingCard({
  plan,
  name,
  priceMonthly,
  messageCredits,
  storageMb,
  features,
  isCurrentPlan,
  isPopular,
  organizationId,
  hasStripeCustomer,
  isManagingBilling,
  onManageBilling,
}: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    if (plan === "free") return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          plan,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const priceDisplay = priceMonthly === 0 ? "Free" : `$${priceMonthly / 100}`;

  return (
    <Card className={isPopular ? "border-primary ring-2 ring-primary" : ""}>
      <CardHeader>
        {isPopular && (
          <span className="mb-2 w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Most Popular
          </span>
        )}
        <CardTitle className="text-xl">{name}</CardTitle>
        <div className="mt-4">
          <span className="text-4xl font-bold">{priceDisplay}</span>
          {priceMonthly > 0 && <span className="text-muted-foreground">/month</span>}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="mb-6 space-y-2 text-sm">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-muted-foreground">Message Credits</span>
            <span className="font-medium">{messageCredits.toLocaleString()}/mo</span>
          </div>
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-muted-foreground">Storage</span>
            <span className="font-medium">
              {storageMb >= 1024 ? `${storageMb / 1024} GB` : `${storageMb} MB`}
            </span>
          </div>
        </div>
        <ul className="space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {isCurrentPlan ? (
          hasStripeCustomer ? (
            <Button className="w-full" variant="outline" onClick={onManageBilling} disabled={isManagingBilling}>
              {isManagingBilling ? "Loading..." : "Manage Subscription"}
            </Button>
          ) : (
            <Button className="w-full" variant="outline" disabled>
              Current Plan
            </Button>
          )
        ) : plan === "free" ? (
          <Button className="w-full" variant="outline" disabled>
            Free Forever
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={handleSubscribe}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : `Upgrade to ${name}`}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
