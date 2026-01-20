import Stripe from "stripe";
import type { Plan } from "./types";

/**
 * Lazy-initialized Stripe client.
 * Uses singleton pattern to avoid creating multiple instances.
 */
let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    stripeClient = new Stripe(secretKey, {
      typescript: true,
    });
  }
  return stripeClient;
}

/**
 * Plan configuration with Stripe price IDs and limits.
 * Price IDs should be configured in Stripe dashboard and stored as env vars.
 */
export interface PlanConfig {
  name: string;
  stripePriceId: string | null; // null for free plan
  messageCreditsLimit: number;
  storageLimitKb: number;
  priceMonthly: number; // in cents
}

export const PLAN_CONFIG: Record<Plan, PlanConfig> = {
  free: {
    name: "Free",
    stripePriceId: null,
    messageCreditsLimit: 1000,
    storageLimitKb: 100_000, // 100 MB
    priceMonthly: 0,
  },
  hobby: {
    name: "Hobby",
    stripePriceId: process.env.STRIPE_HOBBY_PRICE_ID ?? "price_hobby",
    messageCreditsLimit: 5000,
    storageLimitKb: 500_000, // 500 MB
    priceMonthly: 4000, // $40
  },
  standard: {
    name: "Standard",
    stripePriceId: process.env.STRIPE_STANDARD_PRICE_ID ?? "price_standard",
    messageCreditsLimit: 25000,
    storageLimitKb: 2_000_000, // 2 GB
    priceMonthly: 15000, // $150
  },
  pro: {
    name: "Pro",
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? "price_pro",
    messageCreditsLimit: 100000,
    storageLimitKb: 10_000_000, // 10 GB
    priceMonthly: 50000, // $500
  },
};

/**
 * Get plan from Stripe price ID.
 */
export function getPlanFromPriceId(priceId: string): Plan | null {
  for (const [plan, config] of Object.entries(PLAN_CONFIG)) {
    if (config.stripePriceId === priceId) {
      return plan as Plan;
    }
  }
  return null;
}

/**
 * Get plan config by plan name.
 */
export function getPlanConfig(plan: Plan): PlanConfig {
  return PLAN_CONFIG[plan];
}

/**
 * Verify Stripe webhook signature.
 * Returns the parsed event if valid, throws if invalid.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set");
  }

  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Stripe webhook event types we handle.
 */
export type StripeWebhookEvent =
  | "checkout.session.completed"
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "invoice.payment_succeeded"
  | "invoice.payment_failed";

/**
 * Check if an event type is one we handle.
 */
export function isHandledWebhookEvent(
  eventType: string
): eventType is StripeWebhookEvent {
  const handledEvents: StripeWebhookEvent[] = [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
  ];
  return handledEvents.includes(eventType as StripeWebhookEvent);
}
