import { httpRouter } from "convex/server";
import { streamChat } from "./chatStream";

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

export default http;
