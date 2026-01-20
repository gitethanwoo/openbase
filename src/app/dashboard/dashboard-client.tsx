"use client";

import { useRouter } from "next/navigation";
import { OrganizationSwitcher } from "@/components/organization-switcher";
import { setCurrentOrganizationId } from "@/lib/organization-session";

interface DashboardClientProps {
  workosUserId: string;
  currentOrganizationId?: string;
}

export function DashboardClient({
  workosUserId,
  currentOrganizationId,
}: DashboardClientProps) {
  const router = useRouter();

  const handleOrganizationChange = async (orgId: string) => {
    await setCurrentOrganizationId(orgId);
    router.refresh();
  };

  return (
    <OrganizationSwitcher
      workosUserId={workosUserId}
      currentOrganizationId={currentOrganizationId}
      onOrganizationChange={handleOrganizationChange}
    />
  );
}
