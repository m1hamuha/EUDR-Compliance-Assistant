# Deployment Guide

This app is a standard Next.js 16 (App Router) application backed by PostgreSQL.
It deploys cleanly to **Vercel** with a managed Postgres provider (Neon, Supabase,
Railway, or Vercel Postgres). The production build is deterministic and does
**not** require any runtime secrets to compile.

## 1. Provision a PostgreSQL database

Pick any managed Postgres provider and copy its connection string:

- **Neon** (recommended, generous free tier) — https://neon.tech
- **Supabase** — https://supabase.com
- **Railway** — https://railway.app

You will get a URL like:

```
postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

For serverless platforms, prefer the provider's **pooled** connection string
(e.g. Neon's `-pooler` host) for `DATABASE_URL`.

## 2. Configure environment variables

Set these in the Vercel project (Settings → Environment Variables). See
`.env.example` for the full list — they are validated at runtime by
`src/lib/env-validation.ts`.

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | ✅ | Pooled Postgres connection string |
| `AUTH_SECRET` | ✅ | ≥32 chars — `openssl rand -base64 32` |
| `REFRESH_SECRET` | ✅ | ≥32 chars — a *different* `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public URL, e.g. `https://app.example.com` |
| `RESEND_API_KEY` | optional | Without it, invitation/welcome emails are skipped (logged, not sent) |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `R2_PUBLIC_URL` | for exports | Cloudflare R2 (S3-compatible) for the GeoJSON export bundles |

> The email and R2 integrations are only exercised when those features are used,
> so you can deploy and demo the full dashboard/analytics flow with just the
> first four variables.

## 3. Apply the database schema

Prisma uses a driver adapter, so there is no `url` in `schema.prisma` — it reads
`DATABASE_URL` from the environment via `prisma.config.ts`.

For a first deploy, push the schema (no migration history required):

```bash
DATABASE_URL="<your-url>" npx prisma db push
```

Or, if you maintain migrations:

```bash
DATABASE_URL="<your-url>" npx prisma migrate deploy
```

`prisma generate` runs automatically during `npm run build`.

## 4. Deploy to Vercel

1. Import the GitHub repository at https://vercel.com/new.
2. Framework preset: **Next.js** (auto-detected).
3. Build command: `npm run build` (default). Install command: `npm install`.
4. Add the environment variables from step 2.
5. Deploy.

After the first deploy, run step 3 once against the production database (locally
or via a one-off job) so the tables exist.

## 5. Verify

- `GET https://<your-domain>/api/health` → `{"status":"ok","database":"connected"}`
- Sign up, then click **Load sample data** on the empty dashboard to populate a
  realistic supply chain and see Analytics / the Compliance report light up.

## CI/CD

`.github/workflows/ci.yml` runs lint, typecheck, tests (with coverage), a
production build, and a dependency/security audit on every PR to `main`.

## Docker (alternative)

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Provide the same environment variables at container runtime and run
`npx prisma db push` (or `migrate deploy`) against your database before first
start.
