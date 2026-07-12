# Scope

## In scope (MVP)
- Log weight: date + weight (kg), optional note.
- Log exercise: date, type (walk/run/gym/cycling/other), duration, optional distance.
- Log daily steps: date + step count.
- Log diet: free-text food name + quantity → LLM-estimated calories/macros, user-editable.
- Dashboard: today's summary card, recent-entries list.
- Charts (Phase 2): weight trend, calories in vs. estimated calories out, steps trend.
- Shared-secret middleware gate for the public deployment.
- Release hardening: supported framework versions, server-side input validation, accessible
  responsive UI, automated verification, and documented Vercel deployment/rollback steps.

## Explicitly out of scope — do not build without a SCOPE.md update first
- Multi-user accounts / auth / RLS.
- Apple Health, Google Fit, or any wearable device sync.
- Barcode scanning or photo-based food recognition.
- Social features: sharing, leaderboards, gamification badges.
- Native mobile app — this is a responsive web dashboard only.
- OpenAI fallback path for calorie estimation (deferred to Phase 3, conditional).

If a feature isn't listed above as in-scope, it doesn't get built in this phase, no matter
how small it looks. Add it to ROADMAP.md as a later phase instead of doing it inline.
