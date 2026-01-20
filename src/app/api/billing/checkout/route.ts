import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { getStripe, PLAN_CONFIG } from "@/lib/stripe";
import type { Plan } from "@/lib/types";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface CheckoutRequest {
  organizationId: string;
  plan: Plan;
  successUrl?: string;
  cancelUrl?: string;
}

export async function POST(req: Request) {
  const body: CheckoutRequest = await req.json();
  const { organizationId, plan, successUrl, cancelUrl } = body;

  // Validate plan
  if (!plan || !(plan in PLAN_CONFIG)) {
    return Response.json(
      { error: "Invalid plan" },
      { status: 400 }
    );
  }

  const planConfig = PLAN_CONFIG[plan];

  // Free plan doesn't need checkout
  if (!planConfig.stripePriceId) {
    return Response.json(
      { error: "Free plan does not require checkout" },
      { status: 400 }
    );
  }

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

  const stripe = getStripe();

  // Create or retrieve Stripe customer
  let customerId = org.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: {
        organizationId: organizationId,
        organizationName: org.name,
      },
    });
    customerId = customer.id;

    // Save customer ID to Convex
    await convex.mutation(api.billing.setStripeCustomerId, {
      organizationId: organizationId as Id<"organizations">,
      stripeCustomerId: customerId,
    });
  }

  // Determine URLs
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const finalSuccessUrl = successUrl || `${baseUrl}/dashboard/settings/billing?success=true`;
  const finalCancelUrl = cancelUrl || `${baseUrl}/dashboard/settings/billing?cancelled=true`;

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: planConfig.stripePriceId,
        quantity: 1,
      },
    ],
    success_url: finalSuccessUrl,
    cancel_url: finalCancelUrl,
    subscription_data: {
      metadata: {
        organizationId: organizationId,
        plan: plan,
      },
    },
    metadata: {
      organizationId: organizationId,
      plan: plan,
    },
  });

  return Response.json({
    sessionId: session.id,
    url: session.url,
  });
}
