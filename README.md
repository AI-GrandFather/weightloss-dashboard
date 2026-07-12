# WeightLoss Dashboard

A private, single-user health dashboard built with Next.js, TypeScript, Postgres,
Tailwind, shadcn/ui, Recharts, and a cache-first Groq nutrition estimator.

The source can be public. The deployed dashboard must remain protected by its shared-secret
gate because it stores personal health data.

## Local setup

1. Use Node.js 22 or newer.
2. Run `npm ci`.
3. Copy `.env.example` to `.env` and enter server-only credentials.
4. Apply `schema.sql` to the Postgres database.
5. Run `npm run dev` and open `http://localhost:3000`.

Never commit `.env`. Client-side Supabase credentials are not required because all database
access runs on the server through `DATABASE_URL`.

## Verification

Run the complete release gate:

```bash
npm run check
```

This runs ESLint, TypeScript, unit tests, and the optimized production build.

## Vercel deployment

Import the GitHub repository into Vercel and configure these Production environment values:

- `DATABASE_URL`
- `GROQ_API_KEY`
- `SHARED_SECRET` — use a long, random passphrase

Optional LiteLLM proxy values are documented in `.env.example`. The application fails closed
when `DATABASE_URL` or `SHARED_SECRET` is missing. Vercel automatically builds the Next.js app
on every push to `main`; pull requests receive preview deployments.

Before entering real data, verify that an incognito request redirects to `/gate`, an invalid
passcode remains rejected, and the correct passcode unlocks the dashboard.

## Rollback

Use Vercel's Deployments page to promote the last known-good deployment. This release does not
run database migrations automatically, so an application rollback does not mutate stored data.
Database schema changes must be reviewed and applied separately; confirm before destructive
database operations.
