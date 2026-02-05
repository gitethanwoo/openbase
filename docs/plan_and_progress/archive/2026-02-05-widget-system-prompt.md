# Fix Widget System Prompt Flow

- Status: Completed
- Owner: Codex
- Started: 2026-02-05
- Completed: 2026-02-05

## Objective

Ensure the floating widget and embed chat use the agent's system prompt without exposing it to the client, and add logging to observe the request flow.

## Plan

1. Observe current widget/chat request payloads and agent data shape.
2. Update the chat API route to resolve the system prompt server-side when missing.
3. Verify the endpoint behavior and update this log.

## Done Criteria

- `/api/chat` applies an agent system prompt when the request omits one but provides `agentId`.
- Logging captures the incoming request and resolved system prompt for debugging.
- A test request shows the system prompt is used in the generated messages.

## Progress

- 2026-02-05: Inspected widget and chat routes; confirmed widget payload omits system prompt and `/api/chat` only used request-provided prompt.
- 2026-02-05: Added server-side system prompt resolution in `/api/chat` and added request/system prompt logs.
- 2026-02-05: Sent a POST to `/api/chat` with agentId and no system prompt; received 200 and streamed response.

## Verification

- `npx convex run testHelpers:createTestData`
- `curl -i -N -X POST http://localhost:3000/api/chat ...` (200, streamed response)
- `pnpm run typecheck`

## Outcomes

- Updated `/api/chat` to fetch the agent system prompt when missing in the request.

## Follow-ups

- Confirm server logs in the running dev process show the resolved system prompt.
