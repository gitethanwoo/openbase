import { handleAuth } from "@workos-inc/authkit-nextjs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const GET = handleAuth({
  returnPathname: "/dashboard",
  onSuccess: async ({ user }) => {
    // Sync user to Convex on login
    // This creates the user and a default organization if they don't exist
    await convex.mutation(api.users.syncUserOnLogin, {
      workosUserId: user.id,
      email: user.email,
      name: user.firstName
        ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
        : user.email.split("@")[0],
      avatarUrl: user.profilePictureUrl ?? undefined,
    });
  },
});
