"use server";

import { cookies } from "next/headers";

const CURRENT_ORG_COOKIE = "current-organization-id";

/**
 * Get the current organization ID from the session cookie.
 */
export async function getCurrentOrganizationId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CURRENT_ORG_COOKIE)?.value ?? null;
}

/**
 * Set the current organization ID in the session cookie.
 */
export async function setCurrentOrganizationId(
  organizationId: string
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CURRENT_ORG_COOKIE, organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });
}

/**
 * Clear the current organization ID from the session cookie.
 */
export async function clearCurrentOrganizationId(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CURRENT_ORG_COOKIE);
}
