"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { DashboardHeader } from "./dashboard-header";
import { setCurrentOrganizationId } from "@/lib/organization-session";

interface DashboardLayoutProps {
  children: React.ReactNode;
  workosUserId: string;
  currentOrganizationId?: string;
  organizationName?: string;
}

export function DashboardLayout({
  children,
  workosUserId,
  currentOrganizationId,
  organizationName,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const handleOrganizationChange = async (orgId: string) => {
    await setCurrentOrganizationId(orgId);
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col lg:ml-0">
        <DashboardHeader
          organizationName={organizationName}
          workosUserId={workosUserId}
          currentOrganizationId={currentOrganizationId}
          onOrganizationChange={handleOrganizationChange}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
