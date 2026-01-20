import Link from "next/link";
import { redirect } from "next/navigation";
import { getSignInUrl, getSignUpUrl, withAuth } from "@workos-inc/authkit-nextjs";

export default async function LoginPage() {
  const { user } = await withAuth();

  if (user) {
    redirect("/dashboard");
  }

  const signInUrl = await getSignInUrl();
  const signUpUrl = await getSignUpUrl();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome to FaithBase</h1>
          <p className="mt-2 text-gray-600">
            Sign in to access your dashboard
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href={signInUrl}
            className="flex w-full justify-center rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Sign in
          </Link>

          <Link
            href={signUpUrl}
            className="flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
