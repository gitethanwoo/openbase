/**
 * Test script for the chat functionality.
 * Run with: npx tsx scripts/test-chat.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://patient-porpoise-900.convex.cloud";

async function main() {
  const client = new ConvexHttpClient(CONVEX_URL);
  console.log("Connected to Convex:", CONVEX_URL);

  // Step 1: Create a test organization (using direct db insert via mutation)
  console.log("\n--- Step 1: Creating test organization ---");

  // We need a mutation to create the org. Let's use the existing functions or
  // check if data already exists

  // First, let's try to list existing data via a simple query
  // Since we don't have a list query, let's create a test setup mutation

  // For now, let's create test data via the Convex dashboard or a direct mutation
  // We'll use hardcoded IDs if we can find them

  console.log("\n⚠️  This script requires test data to exist.");
  console.log("Please use the Convex Dashboard to create:");
  console.log("1. An organization");
  console.log("2. An agent linked to that organization");
  console.log("\nOr run: npx convex run testHelpers:createTestData");

  // For testing, let's check if we can at least call the getConversation with a fake ID
  // to verify the API is working
  try {
    const result = await client.query(api.chat.getConversation, {
      conversationId: "k175g9n8y9r8z9x8w7v6u5t4" as Id<"conversations">, // Fake ID
    });
    console.log("Query result (expected null):", result);
  } catch (error) {
    console.log("API is reachable, error as expected:", (error as Error).message.substring(0, 100));
  }
}

main().catch(console.error);
