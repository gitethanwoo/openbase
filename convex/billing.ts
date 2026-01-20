import { v } from "convex/values";
import { mutation, query, internalMutation, httpAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import Stripe from "stripe";

/**
 * Plan limits configuration.
 * This must match the PLAN_CONFIG in src/lib/stripe.ts
 */
const PLAN_LIMITS = {
  free: { messageCreditsLimit: 1000, storageLimitKb: 100_000 },
  starter: { messageCreditsLimit: 5000, storageLimitKb: 500_000 },
  pro: { messageCreditsLimit: 25000, storageLimitKb: 2_000_000 },
  enterprise: { messageCreditsLimit: 100000, storageLimitKb: 10_000_000 },
} as const;

type PlanType = keyof typeof PLAN_LIMITS;

function isPlanType(plan: string): plan is PlanType {
  return plan in PLAN_LIMITS;
}

/**
 * Get billing status for an organization.
 */
export const getBillingStatus = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org || org.deletedAt) {
      return null;
    }

    return {
      plan: org.plan,
      stripeCustomerId: org.stripeCustomerId,
      stripeSubscriptionId: org.stripeSubscriptionId,
      messageCreditsUsed: org.messageCreditsUsed,
      messageCreditsLimit: org.messageCreditsLimit,
      storageUsedKb: org.storageUsedKb,
      storageLimitKb: org.storageLimitKb,
      billingCycleStart: org.billingCycleStart,
    };
  },
});

/**
 * Set Stripe customer ID for an organization.
 * Called after creating a Stripe customer.
 */
export const setStripeCustomerId = mutation({
  args: {
    organizationId: v.id("organizations"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org || org.deletedAt) {
      throw new Error("Organization not found");
    }

    await ctx.db.patch(args.organizationId, {
      stripeCustomerId: args.stripeCustomerId,
    });

    return args.organizationId;
  },
});

/**
 * Update organization subscription after Stripe webhook.
 * Internal mutation to be called from webhook handler.
 */
export const updateSubscription = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    stripeSubscriptionId: v.string(),
    plan: v.string(),
    status: v.string(), // Stripe subscription status
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org || org.deletedAt) {
      throw new Error("Organization not found");
    }

    const plan = args.plan;
    if (!isPlanType(plan)) {
      throw new Error(`Invalid plan: ${plan}`);
    }

    const limits = PLAN_LIMITS[plan];

    // Only update if subscription is active
    if (args.status === "active" || args.status === "trialing") {
      await ctx.db.patch(args.organizationId, {
        stripeSubscriptionId: args.stripeSubscriptionId,
        plan: plan,
        messageCreditsLimit: limits.messageCreditsLimit,
        storageLimitKb: limits.storageLimitKb,
      });
    }

    return args.organizationId;
  },
});

/**
 * Handle subscription cancellation.
 * Downgrades to free plan when subscription is cancelled or expired.
 */
export const handleSubscriptionCancelled = internalMutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org || org.deletedAt) {
      throw new Error("Organization not found");
    }

    const freeLimits = PLAN_LIMITS.free;

    await ctx.db.patch(args.organizationId, {
      stripeSubscriptionId: undefined,
      plan: "free",
      messageCreditsLimit: freeLimits.messageCreditsLimit,
      storageLimitKb: freeLimits.storageLimitKb,
    });

    return args.organizationId;
  },
});

/**
 * Reset message credits at the start of a new billing cycle.
 * Called by webhook when invoice.payment_succeeded fires.
 */
export const resetBillingCycle = internalMutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org || org.deletedAt) {
      throw new Error("Organization not found");
    }

    await ctx.db.patch(args.organizationId, {
      messageCreditsUsed: 0,
      billingCycleStart: Date.now(),
    });

    return args.organizationId;
  },
});

/**
 * Get organization by Stripe customer ID.
 * Used by webhook handler to find the org.
 */
export const getOrganizationByStripeCustomerId = query({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    // Note: This is a full table scan. For production, add an index.
    const orgs = await ctx.db.query("organizations").collect();
    const org = orgs.find(
      (o) => o.stripeCustomerId === args.stripeCustomerId && !o.deletedAt
    );
    return org ?? null;
  },
});

/**
 * Internal query version for use in internal mutations.
 */
export const getOrganizationByStripeCustomerIdInternal = internalQuery({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const orgs = await ctx.db.query("organizations").collect();
    const org = orgs.find(
      (o) => o.stripeCustomerId === args.stripeCustomerId && !o.deletedAt
    );
    return org ?? null;
  },
});

/**
 * Get Stripe client lazily initialized.
 */
function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  return new Stripe(secretKey, {
    typescript: true,
  });
}

/**
 * Get plan from Stripe price ID.
 */
function getPlanFromPriceId(priceId: string): PlanType | null {
  // Check environment variables for price IDs
  const starterPriceId = process.env.STRIPE_STARTER_PRICE_ID;
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
  const enterprisePriceId = process.env.STRIPE_ENTERPRISE_PRICE_ID;

  if (priceId === starterPriceId) return "starter";
  if (priceId === proPriceId) return "pro";
  if (priceId === enterprisePriceId) return "enterprise";

  return null;
}

/**
 * HTTP action to handle Stripe webhooks.
 * This runs in Convex and can call internal mutations.
 */
export const stripeWebhook = httpAction(async (ctx, request) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return new Response(JSON.stringify({ error: "Webhook not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawBody = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log(`Processing Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const organizationId = session.metadata?.organizationId;
        if (organizationId && session.customer && typeof session.customer === "string") {
          await ctx.runMutation(internal.billing.setStripeCustomerIdInternal, {
            organizationId: organizationId as Id<"organizations">,
            stripeCustomerId: session.customer,
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        const org = await ctx.runQuery(internal.billing.getOrganizationByStripeCustomerIdInternal, {
          stripeCustomerId: customerId,
        });

        if (org) {
          const priceId = subscription.items.data[0]?.price.id;
          if (priceId) {
            const plan = getPlanFromPriceId(priceId);
            if (plan) {
              await ctx.runMutation(internal.billing.updateSubscription, {
                organizationId: org._id,
                stripeSubscriptionId: subscription.id,
                plan,
                status: subscription.status,
              });
              console.log(`Subscription updated for org ${org._id}: plan=${plan}`);
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        const org = await ctx.runQuery(internal.billing.getOrganizationByStripeCustomerIdInternal, {
          stripeCustomerId: customerId,
        });

        if (org) {
          await ctx.runMutation(internal.billing.handleSubscriptionCancelled, {
            organizationId: org._id,
          });
          console.log(`Subscription cancelled for org ${org._id}`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        // Check if this is a subscription-related invoice (not a one-off)
        const isSubscriptionInvoice =
          invoice.billing_reason === "subscription_cycle" ||
          invoice.billing_reason === "subscription_create" ||
          invoice.billing_reason === "subscription_update";

        if (isSubscriptionInvoice) {
          const customerId =
            typeof invoice.customer === "string"
              ? invoice.customer
              : invoice.customer?.id;

          if (customerId) {
            const org = await ctx.runQuery(internal.billing.getOrganizationByStripeCustomerIdInternal, {
              stripeCustomerId: customerId,
            });

            if (org) {
              await ctx.runMutation(internal.billing.resetBillingCycle, {
                organizationId: org._id,
              });
              console.log(`Billing cycle reset for org ${org._id}`);
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        console.error(
          `Payment failed for customer ${customerId}. Invoice: ${invoice.id}. Attempt: ${invoice.attempt_count}`
        );
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/**
 * Internal mutation to set Stripe customer ID.
 * Used by webhook handler.
 */
export const setStripeCustomerIdInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org || org.deletedAt) {
      throw new Error("Organization not found");
    }

    await ctx.db.patch(args.organizationId, {
      stripeCustomerId: args.stripeCustomerId,
    });

    return args.organizationId;
  },
});
