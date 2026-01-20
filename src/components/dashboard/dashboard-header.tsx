"use client";

import { Menu } from "lucide-react";
import { OrganizationSwitcher } from "@/components/organization-switcher";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  organizationName?: string;
  workosUserId: string;
  currentOrganizationId?: string;
  onOrganizationChange: (orgId: string) => void;
  onMenuClick: () => void;
}

export function DashboardHeader({
  organizationName,
  workosUserId,
  currentOrganizationId,
  onOrganizationChange,
  onMenuClick,
}: DashboardHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>

        {organizationName && (
          <h1 className="text-lg font-semibold">{organizationName}</h1>
        )}
      </div>

      <div className="flex items-center gap-4">
        <OrganizationSwitcher
          workosUserId={workosUserId}
          currentOrganizationId={currentOrganizationId}
          onOrganizationChange={onOrganizationChange}
        />
      </div>
    </header>
  );
}
