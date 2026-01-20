import { withAuth, signOut } from "@workos-inc/authkit-nextjs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import {
  getCurrentOrganizationId,
  setCurrentOrganizationId,
} from "@/lib/organization-session";
import { DashboardLayout, UsageStats, UsageLimitBanner } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConvexProvider } from "@/components/providers/convex-provider";

type OrganizationWithRole = Doc<"organizations"> & {
  userRole: string;
  userId: Id<"users">;
};

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function DashboardPage() {
  const { user } = await withAuth({ ensureSignedIn: true });

  // Get user's organizations
  const organizations: OrganizationWithRole[] = await convex.query(
    api.organizations.listUserOrganizations,
    { workosUserId: user.id }
  );

  // Get current organization from session or default to first
  let currentOrgId = await getCurrentOrganizationId();

  // If no current org or current org is not in list, default to first
  const validOrg = organizations.find((org) => org._id === currentOrgId);
  if (!validOrg && organizations.length > 0) {
    currentOrgId = organizations[0]._id;
    await setCurrentOrganizationId(currentOrgId);
  }

  const currentOrg = organizations.find((org) => org._id === currentOrgId);

  return (
    <DashboardLayout
      workosUserId={user.id}
      currentOrganizationId={currentOrgId ?? undefined}
      organizationName={currentOrg?.name}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome{user.firstName ? `, ${user.firstName}` : ""}!
            </h2>
            <p className="text-muted-foreground">
              You are now signed in to your FaithBase dashboard.
            </p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>

        {currentOrg && (
          <Card>
            <CardHeader>
              <CardTitle>Current Organization</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{currentOrg.name}</p>
              <p className="text-sm text-muted-foreground">/{currentOrg.slug}</p>
              <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                <span>Plan: {currentOrg.plan}</span>
                <span>Vertical: {currentOrg.vertical}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {currentOrgId && (
          <ConvexProvider>
            <UsageLimitBanner organizationId={currentOrgId as Id<"organizations">} />
            <UsageStats organizationId={currentOrgId as Id<"organizations">} />
          </ConvexProvider>
        )}
      </div>
    </DashboardLayout>
  );
}
