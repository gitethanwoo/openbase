# US-113 - Streaming HTTP action with persistent-text-streaming

**Status:** Completed
**Started:** 2026-01-19
**Completed:** 2026-01-19

## Objective

Implement streaming chat responses using @convex-dev/persistent-text-streaming so users see tokens appear in real-time.

## Done Criteria

- [x] @convex-dev/persistent-text-streaming installed
- [x] HTTP action endpoint for chat requests
- [x] Streams tokens to client in real-time
- [x] Batches writes to DB efficiently
- [x] Handles disconnect/reconnect gracefully
- [x] pnpm run typecheck passes
- [x] pnpm run lint passes

## Plan

1. Check if persistent-text-streaming is already installed, install if not
2. Review the reference docs for persistent-text-streaming
3. Review existing convex schema and chat-related code
4. Create the streaming text table in the schema
5. Create HTTP action endpoint for chat requests
6. Integrate with existing RAG and prompt construction (US-111, US-112)
7. Run typecheck and lint
8. Commit changes

## Progress Log

### 2026-01-19
- Starting implementation
- Installed @convex-dev/persistent-text-streaming v0.3.0
- Created convex/convex.config.ts to register the streaming component
- Created convex/chat.ts with:
  - createConversation mutation (creates conversation + user message + stream)
  - sendMessage mutation (adds message to existing conversation + creates stream)
  - getStreamBody query (subscribes to stream content via database)
  - getMessages query (gets all messages for a conversation)
  - getConversation query (gets conversation details)
  - getConversationHistory query (for LLM context building)
  - updateMessageAfterStream internal mutation (updates message when stream completes)
- Created convex/chatStream.ts with streamChat HTTP action:
  - Integrates with RAG (vector search via US-111, prompt building via US-112)
  - Calls OpenRouter API with streaming enabled
  - Uses persistent-text-streaming to stream tokens to client
  - Updates message in DB with final content, citations, and usage stats
  - Handles CORS for cross-origin requests
- Created convex/http.ts router exposing /chat-stream endpoint
- Verified typecheck passes
- Verified lint passes (only warnings in auto-generated files)

## Verification Commands

```bash
pnpm run typecheck  # Passes
pnpm run lint       # Passes (4 warnings in _generated files only)
```

## Files Created/Modified

- package.json - added @convex-dev/persistent-text-streaming dependency
- convex/convex.config.ts - component registration (new)
- convex/chat.ts - chat mutations and queries (new)
- convex/chatStream.ts - HTTP action for streaming (new)
- convex/http.ts - HTTP router (new)
