# Roadmap

## Phase 1 — Core logging
- Supabase schema: `weight_logs`, `exercise_logs`, `daily_steps`, `diet_logs`, `food_cache`
  (see db/schema.sql).
- Manual entry forms for all four log types.
- LLM calorie estimation pipeline: normalize food name → check `food_cache` → on miss, call
  Groq via LiteLLM → store result in both `food_cache` and `diet_logs`.
- Shared-secret middleware gate (D006) — must ship before any real data goes in.
- Dashboard v0: today's summary + chronological entry list. No charts yet.

## Phase 2 — Visualization
- Recharts: weight trend line, calories in vs. out, steps trend, exercise minutes/week.
- Streak view: consecutive days logged.
- Goal setting: target weight, target daily calories, simple progress indicator. (COMPLETE)

## Phase 3 — LLM refinement (conditional)
- Only if Phase 1 usage shows Groq estimation accuracy is a real problem: add OpenAI fallback
  via LiteLLM for low-confidence or ambiguous food-name lookups.
- Editable macro corrections feed back into `food_cache` so the estimate improves over time.

## Phase 4 — Polish (COMPLETE)
- Mobile-responsive pass, PWA manifest. (COMPLETE)
- CSV export. (COMPLETE)
- Empty states, loading states, error states across all forms. (COMPLETE)

Each phase ends with `npm run typecheck && npm run build` passing and a COMMITS.md entry
before starting the next.

