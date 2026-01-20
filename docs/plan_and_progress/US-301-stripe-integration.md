# US-301 - Stripe Integration (checkout, webhooks, portal)

- Status: In Progress
- Owner: Claude
- Started: 2026-01-19
- Completed:

## Objective

Implement Stripe integration to process payments and manage subscriptions for the white-label AI chatbot platform. This includes checkout session creation, webhook handling for subscription events, and customer portal access for self-service billing management.

## Plan

1. Install Stripe SDK (`stripe` npm package)
2. Create Stripe utility library (`src/lib/stripe.ts`) with plan configuration
3. Create billing Convex functions (`convex/billing.ts`) for database operations
4. Create API routes:
   - `POST /api/billing/checkout` - Create Stripe Checkout session
   - `POST /api/billing/webhook` - Handle Stripe webhook events
   - `POST /api/billing/portal` - Create customer portal session
5. Run typecheck and lint to verify

## Done Criteria

- [x] Stripe SDK installed and configured
- [x] Checkout session creation for subscriptions
- [x] Webhook handler for subscription events
- [x] Customer portal access for self-service
- [x] pnpm run typecheck passes
- [x] pnpm run lint passes

## Progress

- 2026-01-19: Started implementation. Schema already has billing fields (stripeCustomerId, stripeSubscriptionId, plan, messageCreditsLimit, etc.). ENV vars documented in .env.example.
- 2026-01-19: Completed implementation. Created:
  - `src/lib/stripe.ts` - Stripe client and plan configuration
  - `convex/billing.ts` - Billing queries, mutations, and webhook HTTP action
  - `src/app/api/billing/checkout/route.ts` - Checkout session creation
  - `src/app/api/billing/portal/route.ts` - Customer portal access
  - Added stripe webhook route to `convex/http.ts`

## Verification

- `pnpm run typecheck` - PASSED
- `pnpm run lint` - PASSED (0 errors, 12 warnings - all pre-existing)

## Outcomes

- Stripe SDK v20.2.0 installed
- Checkout API endpoint at `/api/billing/checkout`
- Portal API endpoint at `/api/billing/portal`
- Webhook endpoint at Convex HTTP `/stripe-webhook`

## Follow-ups

- Dashboard billing UI (separate story)
- Usage enforcement in chat endpoint (separate story)
- Add index on `stripeCustomerId` for production performance
