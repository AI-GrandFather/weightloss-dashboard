# Weight loss dashboard — single-user, personal

Stack: Next.js 14 App Router + Supabase + TypeScript + Tailwind + shadcn/ui + Recharts +
LiteLLM (Groq primary, no OpenAI fallback until Phase 3).

## Rules
- Surgical execution only — nothing outside docs/SCOPE.md without updating it first.
- Revert-first on breakage. Never break working code. Confirm before destructive DB actions.
- TypeScript everywhere, no `any`. Tailwind only, no inline styles.
- Conventional commits: feat/fix/refactor/chore.
- `npm run typecheck && npm run build` must pass after every phase.
- No `user_id` columns, no auth, no RLS — single-user by design (docs/DECISIONS.md D006).
- Every LLM calorie/macro lookup checks `food_cache` first before calling Groq
  (docs/DECISIONS.md D003). Never call the LLM directly from a form handler.
- Public deployment requires the shared-secret middleware gate before real data goes in.

## Full context (read on demand, not auto-loaded)
docs/SCOPE.md, docs/DECISIONS.md, docs/ROADMAP.md, db/schema.sql,
docs/ANTIGRAVITY-NOTES.md (harness-specific gotchas — read this before your first session)
