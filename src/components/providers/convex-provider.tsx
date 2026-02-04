"use client";

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useAccessToken, useAuth } from "@workos-inc/authkit-nextjs/components";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function useAuthFromAuthKit() {
  const { accessToken, loading: tokenLoading, refresh } = useAccessToken();
  const { user, loading: userLoading } = useAuth();

  return {
    isLoading: tokenLoading || userLoading,
    isAuthenticated: Boolean(accessToken && user),
    fetchAccessToken: async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (forceRefreshToken) {
        const refreshed = await refresh();
        return refreshed ?? null;
      }
      return accessToken ?? null;
    },
  };
}

export function ConvexProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useAuthFromAuthKit}>
      {children}
    </ConvexProviderWithAuth>
  );
}
