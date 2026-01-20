import { withAuth } from "@workos-inc/authkit-nextjs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import {
  getCurrentOrganizationId,
  setCurrentOrganizationId,
} from "@/lib/organization-session";
import { DashboardLayout } from "@/components/dashboard";
import { ConversationDetail } from "@/components/dashboard/chat-logs/conversation-detail";
import { notFound } from "next/navigation";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationDetailPage({ params }: PageProps) {
  const { conversationId } = await params;
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

  // Get the conversation
  const conversation = await convex.query(api.chat.getConversation, {
    conversationId: conversationId as Id<"conversations">,
  });

  if (!conversation || conversation.organizationId !== currentOrgId) {
    notFound();
  }

  // Get agent for the conversation
  const agent = await convex.query(api.agents.getAgent, {
    agentId: conversation.agentId,
  });

  return (
    <DashboardLayout
      workosUserId={user.id}
      currentOrganizationId={currentOrgId ?? undefined}
      organizationName={currentOrg?.name}
    >
      <ConversationDetail
        conversationId={conversationId}
        conversation={conversation}
        agentName={agent?.name ?? "Unknown Agent"}
      />
    </DashboardLayout>
  );
}
