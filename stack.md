# Stack rules

- TypeScript everywhere, no `any`.
- Tailwind only — no inline styles. Use shadcn/ui components where they fit, don't hand-roll
  what shadcn already provides.
- Conventional commits: feat/fix/refactor/chore.
- No `user_id` columns, no auth, no RLS policies on any table — this is single-user by design
  (see DECISIONS.md D006). If that assumption changes, it's a SCOPE.md change first, not a
  silent schema patch.
- Every LLM calorie/macro lookup goes through `food_cache` first (see DECISIONS.md D003).
  Never call the LLM directly from a form handler without a cache check — this is a cost and
  latency issue, not a style preference.
- Groq is the default model for calorie estimation. Do not add an OpenAI call path until
  Phase 3 is explicitly reached (see ROADMAP.md) — don't build the fallback before there's
  evidence Groq's accuracy needs it.
- Public deployment requires the shared-secret middleware gate (see DECISIONS.md D006) to be
  in place before any real health data is entered. Don't skip this because it's "just for me."
- `npm run typecheck && npm run build` must pass after every phase before moving to the next.
