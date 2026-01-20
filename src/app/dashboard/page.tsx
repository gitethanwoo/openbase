import { withAuth, signOut } from "@workos-inc/authkit-nextjs";

export default async function DashboardPage() {
  const { user } = await withAuth({ ensureSignedIn: true });

  return (
    <div className="flex min-h-screen flex-col p-8">
      <header className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {user.email}
          </span>
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
        </div>
      </main>
    </div>
  );
}
