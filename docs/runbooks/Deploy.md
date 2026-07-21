# Runbook: Deployment

**Last updated:** July 2026
**Owner:** Platform Engineering

## Overview

CreatorStore is deployed on Vercel with a PostgreSQL database via Supabase.

## Prerequisites

- Vercel CLI (`npm i -g vercel`) or GitHub integration
- Access to Supabase project dashboard
- `NEXTAUTH_SECRET`, `DATABASE_URL`, `SUPABASE_*` env vars set in Vercel

## Deployment Steps

### Production Deploy (via git push)
```bash
git checkout main
git pull origin main
git push origin main
# Vercel auto-deploys main branch
```

### Manual Deploy
```bash
npx vercel --prod
```

### Pre-Deploy Checks
```bash
npm run build          # Must pass
npx vitest run         # All tests must pass
npx next lint           # 0 errors
npx prisma generate    # Regenerate client
```

### Database Migrations
```bash
# Apply migrations
npx prisma migrate deploy

# Verify schema
npx prisma db pull --print   # Compare existing DB to schema.prisma
```

### Environment Variables (Vercel)
```
NEXTAUTH_SECRET=<random-32-char>
NEXTAUTH_URL=https://creatorspace.app
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
VERCEL_TOKEN=...
```

## Rollback

```bash
# Option 1: Vercel Dashboard → Deployments → select previous → Promote to Production

# Option 2: Git revert + redeploy
git revert HEAD
git push origin main

# Option 3: Vercel CLI
npx vercel rollback
```

## Health Check
```bash
curl -s https://creatorspace.app/api/health | jq .
```
