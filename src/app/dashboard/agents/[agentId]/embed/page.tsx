import { withAuth } from "@workos-inc/authkit-nextjs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import {
  getCurrentOrganizationId,
  setCurrentOrganizationId,
} from "@/lib/organization-session";
import { DashboardLayout } from "@/components/dashboard";
import { EmbedCodeGenerator } from "@/components/dashboard/agents/embed-code-generator";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface EmbedPageProps {
  params: Promise<{ agentId: string }>;
}

export default async function EmbedPage({ params }: EmbedPageProps) {
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

  // Get the base URL for embed code
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com";

  return (
    <DashboardLayout
      workosUserId={user.id}
      currentOrganizationId={currentOrgId ?? undefined}
      organizationName={currentOrg?.name}
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href="/dashboard/agents"
              className="hover:text-foreground hover:underline"
            >
              Agents
            </Link>
            <span>/</span>
            <Link
              href={`/dashboard/agents/${agent._id}/edit`}
              className="hover:text-foreground hover:underline"
            >
              {agent.name}
            </Link>
            <span>/</span>
            <span>Embed</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Embed Code</h2>
          <p className="text-muted-foreground">
            Add the chatbot to your website using the code snippets below.
          </p>
        </div>

        <EmbedCodeGenerator agent={agent} baseUrl={baseUrl} />
      </div>
    </DashboardLayout>
  );
}
