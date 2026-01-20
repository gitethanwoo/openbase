import { withAuth } from "@workos-inc/authkit-nextjs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import {
  getCurrentOrganizationId,
  setCurrentOrganizationId,
} from "@/lib/organization-session";
import { DashboardLayout } from "@/components/dashboard";
import { PlaygroundClient } from "@/components/dashboard/agents/playground-client";
import { notFound, redirect } from "next/navigation";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface PlaygroundPageProps {
  params: Promise<{ agentId: string }>;
}

export default async function PlaygroundPage({ params }: PlaygroundPageProps) {
  const { agentId } = await params;
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

  // Get the agent
  const agent = await convex.query(api.agents.getAgent, {
    agentId: agentId as Id<"agents">,
  });

  if (!agent) {
    notFound();
  }

  // Verify agent belongs to current organization
  if (agent.organizationId !== currentOrgId) {
    notFound();
  }

  return (
    <DashboardLayout
      workosUserId={user.id}
      currentOrganizationId={currentOrgId ?? undefined}
      organizationName={currentOrg?.name}
    >
      <PlaygroundClient agent={agent} organizationId={currentOrgId} />
    </DashboardLayout>
  );
}
