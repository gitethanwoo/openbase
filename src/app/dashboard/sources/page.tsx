import { withAuth } from "@workos-inc/authkit-nextjs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  getCurrentOrganizationId,
  setCurrentOrganizationId,
} from "@/lib/organization-session";
import { DashboardLayout } from "@/components/dashboard";
import { SourcesList } from "@/components/dashboard/sources/sources-list";
import { redirect } from "next/navigation";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function SourcesPage() {
  const { user } = await withAuth({ ensureSignedIn: true });

  // Get user's organizations
  const organizations = await convex.query(
    api.organizations.listUserOrganizations,
    { workosUserId: user.id }
  );

  // Get current organization from session or default to first
  let currentOrgId = await getCurrentOrganizationId();

  const validOrg = organizations.find((org) => org?._id === currentOrgId);
  if (!validOrg && organizations.length > 0) {
    currentOrgId = organizations[0]?._id;
    if (currentOrgId) {
      await setCurrentOrganizationId(currentOrgId);
    }
  }

  const currentOrg = organizations.find((org) => org?._id === currentOrgId);

  if (!currentOrgId) {
    redirect("/dashboard");
  }

  // Get all sources for the organization
  const sources = await convex.query(api.sources.listSourcesByOrganization, {
    organizationId: currentOrgId as Id<"organizations">,
  });

  // Get all agents for the organization (for the "Add Source" dropdown)
  const agents = await convex.query(api.agents.listAgents, {
    organizationId: currentOrgId as Id<"organizations">,
  });

  return (
    <DashboardLayout
      workosUserId={user.id}
      currentOrganizationId={currentOrgId ?? undefined}
      organizationName={currentOrg?.name}
    >
      <SourcesList
        sources={sources}
        agents={agents}
        organizationId={currentOrgId}
      />
    </DashboardLayout>
  );
}
