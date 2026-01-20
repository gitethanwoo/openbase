"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UsageLimitBannerProps {
  organizationId: Id<"organizations">;
}

const WARNING_THRESHOLD = 80; // Show warning at 80% usage
const CRITICAL_THRESHOLD = 95; // Show critical warning at 95% usage

type LimitStatus = "ok" | "warning" | "critical" | "exceeded";

interface LimitInfo {
  type: "messages" | "storage" | "agents";
  label: string;
  used: number;
  limit: number;
  percent: number;
  status: LimitStatus;
}

function getLimitStatus(percent: number, isUnlimited: boolean): LimitStatus {
  if (isUnlimited) return "ok";
  if (percent >= 100) return "exceeded";
  if (percent >= CRITICAL_THRESHOLD) return "critical";
  if (percent >= WARNING_THRESHOLD) return "warning";
  return "ok";
}

export function UsageLimitBanner({ organizationId }: UsageLimitBannerProps) {
  const usageSummary = useQuery(api.usage.getUsageSummary, { organizationId });

  if (!usageSummary) {
    return null;
  }

  const limits: LimitInfo[] = [
    {
      type: "messages",
      label: "Message credits",
      used: usageSummary.messageCreditsUsed,
      limit: usageSummary.messageCreditsLimit,
      percent: usageSummary.messageCreditsPercent,
      status: getLimitStatus(usageSummary.messageCreditsPercent, false),
    },
    {
      type: "storage",
      label: "Storage",
      used: usageSummary.storageUsedKb,
      limit: usageSummary.storageLimitKb,
      percent: usageSummary.storagePercent,
      status: getLimitStatus(usageSummary.storagePercent, false),
    },
    {
      type: "agents",
      label: "Agents",
      used: usageSummary.agentCount,
      limit: usageSummary.agentLimit,
      percent: usageSummary.agentPercent,
      status: getLimitStatus(
        usageSummary.agentPercent,
        usageSummary.agentLimit === -1
      ),
    },
  ];

  // Find the most critical limit that needs attention
  const exceededLimits = limits.filter((l) => l.status === "exceeded");
  const criticalLimits = limits.filter((l) => l.status === "critical");
  const warningLimits = limits.filter((l) => l.status === "warning");

  // Show the most severe banner
  if (exceededLimits.length > 0) {
    return (
      <ExceededBanner
        limits={exceededLimits}
        plan={usageSummary.plan}
        organizationId={organizationId}
      />
    );
  }

  if (criticalLimits.length > 0) {
    return (
      <CriticalWarningBanner
        limits={criticalLimits}
        plan={usageSummary.plan}
        organizationId={organizationId}
      />
    );
  }

  if (warningLimits.length > 0) {
    return (
      <WarningBanner
        limits={warningLimits}
        plan={usageSummary.plan}
        organizationId={organizationId}
      />
    );
  }

  return null;
}

interface BannerProps {
  limits: LimitInfo[];
  plan: string;
  organizationId: Id<"organizations">;
}

function formatLimitDescription(limit: LimitInfo): string {
  if (limit.type === "storage") {
    const usedMb = (limit.used / 1024).toFixed(1);
    const limitMb = (limit.limit / 1024).toFixed(0);
    return `${usedMb} MB of ${limitMb} MB`;
  }
  return `${limit.used.toLocaleString()} of ${limit.limit.toLocaleString()}`;
}

function ExceededBanner({ limits, plan }: BannerProps) {
  const limitNames = limits.map((l) => l.label.toLowerCase()).join(", ");
  const isPlural = limits.length > 1;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
      <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
      <div className="flex-1">
        <h4 className="font-medium text-red-900">
          {isPlural ? "Limits exceeded" : "Limit exceeded"}
        </h4>
        <p className="mt-1 text-sm text-red-700">
          You&apos;ve reached your {limitNames} limit
          {isPlural ? "s" : ""}. Some features are now restricted.
        </p>
        <ul className="mt-2 space-y-1 text-sm text-red-700">
          {limits.map((limit) => (
            <li key={limit.type}>
              {limit.label}: {formatLimitDescription(limit)} ({limit.percent}%
              used)
            </li>
          ))}
        </ul>
        {plan !== "pro" && (
          <div className="mt-3">
            <Button asChild size="sm" variant="default">
              <Link href="/dashboard/settings/billing">
                Upgrade to continue
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function CriticalWarningBanner({ limits, plan }: BannerProps) {
  const limitNames = limits.map((l) => l.label.toLowerCase()).join(", ");

  return (
    <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600" />
      <div className="flex-1">
        <h4 className="font-medium text-orange-900">Approaching limit</h4>
        <p className="mt-1 text-sm text-orange-700">
          You&apos;re almost out of {limitNames}. Upgrade now to avoid service
          interruption.
        </p>
        <ul className="mt-2 space-y-1 text-sm text-orange-700">
          {limits.map((limit) => (
            <li key={limit.type}>
              {limit.label}: {formatLimitDescription(limit)} ({limit.percent}%
              used)
            </li>
          ))}
        </ul>
        {plan !== "pro" && (
          <div className="mt-3">
            <Button asChild size="sm" variant="default">
              <Link href="/dashboard/settings/billing">Upgrade now</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function WarningBanner({ limits, plan }: BannerProps) {
  const limitNames = limits.map((l) => l.label.toLowerCase()).join(", ");

  return (
    <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
      <div className="flex-1">
        <h4 className="font-medium text-yellow-900">Usage notice</h4>
        <p className="mt-1 text-sm text-yellow-700">
          You&apos;ve used over 80% of your {limitNames}. Consider upgrading for
          more capacity.
        </p>
        {plan !== "pro" && (
          <div className="mt-3">
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/settings/billing">View plans</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
