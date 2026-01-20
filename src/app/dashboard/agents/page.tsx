import { withAuth } from "@workos-inc/authkit-nextjs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  getCurrentOrganizationId,
  setCurrentOrganizationId,
} from "@/lib/organization-session";
import { DashboardLayout } from "@/components/dashboard";
import { AgentsList } from "@/components/dashboard/agents/agents-list";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function AgentsPage() {
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

  // Get agents for current organization
  const agents = currentOrgId
    ? await convex.query(api.agents.listAgents, {
        organizationId: currentOrgId as Id<"organizations">,
      })
    : [];

  return (
    <DashboardLayout
      workosUserId={user.id}
      currentOrganizationId={currentOrgId ?? undefined}
      organizationName={currentOrg?.name}
    >
      <AgentsList agents={agents} organizationId={currentOrgId ?? undefined} />
    </DashboardLayout>
  );
}
