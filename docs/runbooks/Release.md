# Runbook: Release Process

**Last updated:** July 2026
**Owner:** Platform Engineering

## Release Pipeline

```
Feature Branch → PR → Code Review → Merge to main → Vercel Deploy → Smoke Test → Live
```

## Pre-Release Checklist

- [ ] `npm run build` passes
- [ ] `npx vitest run` passes (all 247 tests)
- [ ] `npx next lint` produces 0 errors
- [ ] Feature Completion Audit passes
- [ ] Quality Hardening Audit passes
- [ ] Infrastructure Identity Audit passes
- [ ] Definition of Done gates satisfied
- [ ] PR reviewed by at least one other engineer

## Versioning

CreatorStore uses date-based versioning:
- `main` branch: always deployable
- Releases tagged: `v2026.07.XX`
- Breaking changes flagged in commit message with `BREAKING:`

## Rollback

```bash
# Vercel Dashboard → Deployments → select previous → Promote to Production
# Or:
npx vercel rollback
```

## Post-Release

1. Monitor Vercel dashboard for errors (first 30 min)
2. Check Supabase metrics for query performance
3. Verify AI generation pipeline works
4. Verify payments (Razorpay webhook test)
5. Announce in team channel

## Feature Flags

Features can be toggled without redeploy:
- `/super-admin/features` — toggle `enableYouTubeSync`, `enableInstagramSync`, `maintenanceMode`, etc.
- Stored in `Setting` table with key `platform_config`
