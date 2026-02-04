import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: "https://api.workos.com/",
      applicationID: process.env.WORKOS_CLIENT_ID!,
    },
    {
      domain: "workos.com",
      applicationID: process.env.WORKOS_CLIENT_ID!,
    },
  ],
} satisfies AuthConfig;
