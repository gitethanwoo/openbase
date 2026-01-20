import { withAuth } from "@workos-inc/authkit-nextjs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  getCurrentOrganizationId,
  setCurrentOrganizationId,
} from "@/lib/organization-session";
import { DashboardLayout } from "@/components/dashboard";
import { OrganizationSettingsForm } from "@/components/dashboard/settings/organization-settings-form";
import { redirect } from "next/navigation";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function SettingsPage() {
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

  if (!currentOrgId || !currentOrg) {
    redirect("/dashboard");
  }

  // Get full organization details
  const organization = await convex.query(api.organizations.getOrganization, {
    organizationId: currentOrgId as Id<"organizations">,
  });

  if (!organization) {
    redirect("/dashboard");
  }

  return (
    <DashboardLayout
      workosUserId={user.id}
      currentOrganizationId={currentOrgId ?? undefined}
      organizationName={currentOrg?.name}
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Organization Settings
          </h2>
          <p className="text-muted-foreground">
            Manage your organization&apos;s settings and preferences.
          </p>
        </div>

        <OrganizationSettingsForm organization={organization} />
      </div>
    </DashboardLayout>
  );
}
