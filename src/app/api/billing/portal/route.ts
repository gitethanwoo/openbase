import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { getStripe } from "@/lib/stripe";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface PortalRequest {
  organizationId: string;
  returnUrl?: string;
}

/**
 * Create a Stripe Customer Portal session for self-service billing management.
 * Allows customers to:
 * - Update payment methods
 * - View invoices
 * - Cancel subscriptions
 * - Update billing information
 */
export async function POST(req: Request) {
  const body: PortalRequest = await req.json();
  const { organizationId, returnUrl } = body;

  // Get organization
  const org = await convex.query(api.organizations.getOrganization, {
    organizationId: organizationId as Id<"organizations">,
  });

  if (!org) {
    return Response.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  if (!org.stripeCustomerId) {
    return Response.json(
      { error: "No billing account found. Please subscribe to a plan first." },
      { status: 400 }
    );
  }

  const stripe = getStripe();

  // Determine return URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const finalReturnUrl = returnUrl || `${baseUrl}/dashboard/settings/billing`;

  // Create portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: finalReturnUrl,
  });

  return Response.json({
    url: session.url,
  });
}
