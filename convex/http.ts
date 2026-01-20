import { httpRouter } from "convex/server";
import { streamChat } from "./chatStream";
import { stripeWebhook } from "./billing";

const http = httpRouter();

// Chat streaming endpoint
http.route({
  path: "/chat-stream",
  method: "POST",
  handler: streamChat,
});

// Handle CORS preflight for chat-stream
http.route({
  path: "/chat-stream",
  method: "OPTIONS",
  handler: streamChat,
});

// Stripe webhook endpoint
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: stripeWebhook,
});

export default http;
