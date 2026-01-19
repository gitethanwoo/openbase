# US-116: LLM-as-Judge Safety Evaluation

- Status: In Progress
- Owner: Claude
- Started: 2026-01-19
- Completed:

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

- [ ] Judge function calls secondary LLM (GPT-4o-mini via OpenRouter)
- [ ] Evaluates: safety, grounding, brand alignment
- [ ] FAIL responses replaced with configurable fallback
- [ ] Results logged for review (stored on messages table)
- [ ] pnpm run typecheck passes
- [ ] pnpm run lint passes

## Progress

- 2026-01-19: Created plan, starting implementation

## Verification

- Commands run (lint/typecheck/build) and results

## Outcomes

- What changed (links to PRs/commits)

## Follow-ups

- Dashboard UI to review flagged responses
- Fine-tune judge prompt based on real data
- Consider async judge evaluation for latency optimization
