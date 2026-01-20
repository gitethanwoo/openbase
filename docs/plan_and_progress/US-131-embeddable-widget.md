# US-131: Embeddable Widget JavaScript Bundle

**Status:** Completed
**Started:** 2026-01-19
**Completed:** 2026-01-19

## Objective

Create an embeddable chat widget that customers can add to their websites with a simple script tag.

## Plan

1. Create widget source directory with types, API client, and React component
2. Build self-contained chat widget with inline styles (avoid CSS conflicts)
3. Create entry point that auto-initializes from script data attributes
4. Add API endpoint to fetch agent widget configuration (with CORS)
5. Add CORS headers to chat API for cross-origin requests
6. Configure esbuild to bundle into single minified file
7. Add build script to package.json

## Implementation

### Files Created

- `src/widget/types.ts` - TypeScript types for widget config and messages
- `src/widget/api.ts` - API client for fetching config and streaming chat
- `src/widget/Widget.tsx` - Self-contained React component with inline styles
- `src/widget/index.tsx` - Entry point with auto-initialization
- `src/app/api/widget/[agentId]/route.ts` - API to fetch agent widget config
- `scripts/build-widget.mjs` - esbuild script to produce single bundle

### Files Modified

- `src/app/api/chat/route.ts` - Added CORS headers for widget requests
- `package.json` - Added `build:widget` script and esbuild dependency
- `eslint.config.mjs` - Ignore generated widget bundle

### Bundle Output

- Location: `public/widget/chat.js`
- Size: ~196 KB (unminified), ~62 KB (gzipped)
- Target: ES2020, Chrome 80+, Firefox 78+, Safari 14+, Edge 88+

## Usage

Add this script tag to embed the widget:

```html
<script
  src="https://your-domain.com/widget/chat.js"
  data-agent-id="YOUR_AGENT_ID"
></script>
```

Optional attributes:
- `data-api-url` - Override API URL (defaults to script origin)

## Done Criteria

- [x] Widget builds to single JavaScript file
- [x] Script tag loads widget with data-agent-id attribute
- [x] Bundle size optimized (~62KB gzipped)
- [x] No conflicts with host page (inline styles, isolated scope)
- [x] pnpm run typecheck passes
- [x] pnpm run lint passes

## Verification Commands

```bash
pnpm run build:widget  # Build widget bundle
pnpm run typecheck     # TypeScript check
pnpm run lint          # ESLint check
```
