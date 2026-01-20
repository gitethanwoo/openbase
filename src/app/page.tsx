import Link from "next/link";
import { withAuth, signOut } from "@workos-inc/authkit-nextjs";

export default async function Home() {
  const { user } = await withAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <main className="w-full max-w-2xl space-y-8 text-center">
        <h1 className="text-4xl font-bold">FaithBase</h1>
        <p className="text-lg text-gray-600">
          AI-powered chatbot platform for churches
        </p>

        {user ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              Signed in as <span className="font-medium">{user.email}</span>
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/dashboard"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Go to Dashboard
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button
                  type="submit"
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex justify-center gap-4">
            <Link
              href="/login"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Sign in
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
