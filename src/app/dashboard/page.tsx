import { withAuth, signOut } from "@workos-inc/authkit-nextjs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import {
  getCurrentOrganizationId,
  setCurrentOrganizationId,
} from "@/lib/organization-session";
import { DashboardClient } from "./dashboard-client";

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
    <div className="flex min-h-screen flex-col p-8">
      <header className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <DashboardClient
            workosUserId={user.id}
            currentOrganizationId={currentOrgId ?? undefined}
          />
          <span className="text-sm text-gray-600">{user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button
              type="submit"
              className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mt-8">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            Welcome{user.firstName ? `, ${user.firstName}` : ""}!
          </h2>
          <p className="mt-2 text-gray-600">
            You are now signed in to your FaithBase dashboard.
          </p>
          {currentOrg && (
            <div className="mt-4 rounded-md bg-gray-50 p-4">
              <h3 className="text-sm font-medium text-gray-700">
                Current Organization
              </h3>
              <p className="mt-1 text-lg font-semibold">{currentOrg.name}</p>
              <p className="text-sm text-gray-500">/{currentOrg.slug}</p>
              <div className="mt-2 flex gap-4 text-sm text-gray-600">
                <span>Plan: {currentOrg.plan}</span>
                <span>Vertical: {currentOrg.vertical}</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
