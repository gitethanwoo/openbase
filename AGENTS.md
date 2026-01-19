# White-Label AI Chatbot Platform

## Project Overview

A white-label Chatbase alternative with vertical-specific branding, templates, and integrations. Build once, deploy to multiple verticals (churches, restaurants, legal, etc.). First vertical: FaithBase (churches).

## Key Commands

```bash
# Development
npx convex dev       # Start Convex dev server (run first, in separate terminal)
pnpm run dev          # Start Next.js dev server
pnpm run build        # Build for production
pnpm run lint         # Run ESLint
pnpm run typecheck    # Run TypeScript check

# Convex
npx convex deploy    # Deploy to production
```

## Architecture Notes

- Next.js 16 App Router
- Convex for backend, database, and vector embeddings
- @convex-dev/persistent-text-streaming for chat streaming
- WorkOS AuthKit for auth (SSO, RBAC, organizations)
- OpenRouter for LLM (multi-model support)
- assistant-ui for chat components (widget, playground, help page)
- Vercel Workflow SDK for long-running jobs (file parsing, embedding generation)
- Firecrawl for website scraping
- Stripe for payments
- Braintrust for LLM observability and evals

## Reference Documentation

**IMPORTANT:** Before implementing any feature, consult the relevant docs in `docs/reference/`. These are raw markdown files downloaded from official GitHub repos.

| Component         | Reference Doc                                                  |
| ----------------- | -------------------------------------------------------------- |
| Auth              | `docs/reference/workos-authkit-nextjs.md`                      |
| Auth + Convex     | `docs/reference/workos-convex-template.md`                     |
| Database          | `docs/reference/convex-database.md`, `convex-functions.md`     |
| Streaming         | `docs/reference/convex-persistent-streaming.md`                |
| LLM calls         | `docs/reference/openrouter-api.md`, `openrouter-quickstart.md` |
| Chat UI           | `docs/reference/assistant-ui-getting-started.md`               |
| Jobs/Workflows    | `docs/reference/vercel-workflow-sdk.md`                        |
| Scraping          | `docs/reference/firecrawl.md`                                  |
| Payments          | `docs/reference/stripe-node.md`                                |
| LLM observability | `docs/reference/braintrust.md`                                 |

Full index: `docs/reference/README.md`

## Safety Architecture

- **Context management**: Summarize history, truncate chunks, cap total tokens
- **LLM-as-judge**: Secondary model evaluates every response before sending (brand alignment, safety, grounding, injection detection)

## Plan & Progress

SHOULD Check `docs/PROJECT_SPEC.md` for project vision and current phase before starting work.

MUST Before writing code, duplicate `docs/plan_and_progress/_template.md` and fill in objective, plan, and done criteria. Set status to In Progress.

Update the file as you work: log progress with dates, record verification commands you ran, note blockers.

When done: set status to Completed, add completion date, then move to `docs/plan_and_progress/archive/YYYY-MM-DD-<topic>.md`.
