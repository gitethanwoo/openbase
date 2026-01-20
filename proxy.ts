import { authkitMiddleware } from "@workos-inc/authkit-nextjs";

export default authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ["/", "/login", "/callback"],
  },
});

export const config = {
  matcher: [
    "/",
    "/login",
    "/callback",
    "/dashboard/:path*",
  ],
};
