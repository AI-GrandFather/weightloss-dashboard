# Decisions

**D001 — Stack:** Next.js 14 App Router + Supabase (Postgres) + TypeScript + Tailwind +
shadcn/ui + Recharts, deployed on Vercel.
Rationale: this is a time-series dashboard — every entry is a dated row, and the core
workload is "query last N days, render a chart." Postgres handles that natively; App Router
server components let read paths skip a separate API layer.

**D002 — Diet logging via LLM estimation, not a food database API.**
Rationale: USDA FoodData Central and Open Food Facts have weak coverage of South Asian/
Pakistani dishes, and free-tier geo-availability is inconsistent. An LLM takes free-text
food names ("2 roti with daal") directly, no matching required.
Tradeoff, stated plainly: estimates are approximate. This is for trend awareness, not
clinical nutrition tracking. User can always edit the estimated values.

**D003 — Cache LLM calorie lookups.**
A `food_cache` table, keyed on normalized food name, is checked before every LLM call.
Repeated entries ("2 roti" logged daily) cost one LLM call total, not one per log.
Maps to ECC's content-hash-cache-pattern skill.

**D004 — Model routing: Groq primary, OpenAI fallback deferred.**
LiteLLM is wired in from the start so switching is a config change, not a rewrite — but the
OpenAI fallback path is not built until Phase 3, and only if Groq's estimation accuracy
proves insufficient in practice. Don't build the fallback speculatively.
Maps to ECC's cost-aware-llm-pipeline skill.

**D005 — Steps and exercise: manual entry only for MVP.**
No Apple Health / Google Fit integration. That's a real integration project on its own
(HealthKit entitlements, OAuth for Google Fit) and isn't justified until manual entry proves
to be a retention problem.

**D006 — No auth, but not no protection.**
Single-user app — no `user_id` columns, no Supabase auth, no RLS. That removes real
complexity. But this holds personal health data on a public URL, so a single shared-secret
check via Next.js middleware (one env var, compared server-side, sets a cookie) gates access
before deployment. This is not a login system — no accounts, no sessions beyond the cookie.

**D007 — Harness targets Antigravity CLI; `AGENTS.md` is canonical, not `CLAUDE.md`.**
Antigravity reads `AGENTS.md` at project root and expects rules at `.agent/rules/` (flat).
`CLAUDE.md` is kept only as a pointer in case this repo is ever opened in Claude Code.
See docs/ANTIGRAVITY-NOTES.md for the skills-path ambiguity and the verification step
required before the first real session.

**D008 — Mobile Compatibility and Theme Toggle Layout Overhaul.**
Rationale: To ensure high contrast, proper spacing, and optimal mobile/desktop usage, the 4 manual logging forms were consolidated into a unified Dialog modal with a tabbed layout. The dashboard body now focuses on the timeline activity feed and analytics charts. A theme toggle was added to the header to dynamically switch between dark and light modes, updating both Tailwind layout classes and Recharts grid/label/tooltip colors.

