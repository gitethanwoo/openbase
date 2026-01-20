# US-116: LLM-as-Judge Safety Evaluation

- Status: Completed
- Owner: Claude
- Started: 2026-01-19
- Completed: 2026-01-19

## Objective

Implement an LLM-as-judge safety evaluation layer that evaluates every assistant response before it's sent to the user. The judge will check for safety violations, groundedness in the provided context, and brand alignment. Failed responses will be replaced with a fallback message.

## Plan

1. Update schema with judge evaluation fields on messages table (evaluationResult, safetyScore, groundednessScore, brandAlignmentScore, flagged)
2. Create `convex/judge.ts` with:
   - Judge prompt template for evaluating responses
   - Internal action that calls secondary LLM (GPT-4o-mini for cost efficiency)
   - Evaluation criteria: safety, grounding, brand alignment
   - Structured response parsing
3. Integrate judge call into `chatStream.ts`:
   - After streaming completes, call judge action
   - If FAIL, update message content with fallback
   - Store evaluation result on message for review
4. Add fallback response constant
5. Ensure all evaluation results are logged (stored on message record)

## Done Criteria

- [x] Judge function calls secondary LLM (GPT-4o-mini via OpenRouter)
- [x] Evaluates: safety, grounding, brand alignment
- [x] FAIL responses replaced with configurable fallback
- [x] Results logged for review (stored on messages table)
- [x] pnpm run typecheck passes
- [x] pnpm run lint passes

## Progress

- 2026-01-19: Created plan, starting implementation
- 2026-01-19: Implementation complete, all tests passing

## Verification

- `pnpm run typecheck` - passes
- `pnpm run lint` - passes (only warnings in generated files)

## Outcomes

- Created `convex/judge.ts` - LLM-as-judge evaluation action
- Updated `convex/schema.ts` - Added `judgeEvaluation` field to messages table
- Updated `convex/chatStream.ts` - Integrated judge call after streaming
- Updated `convex/chat.ts` - Added judgeEvaluation to updateMessageAfterStream
- Commit: c5e2433

## Follow-ups

- Dashboard UI to review flagged responses
- Fine-tune judge prompt based on real data
- Consider async judge evaluation for latency optimization
