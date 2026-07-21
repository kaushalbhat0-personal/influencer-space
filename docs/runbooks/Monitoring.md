# Runbook: Monitoring

**Last updated:** July 2026
**Owner:** Platform Engineering

## Monitoring Sources

| Source | What It Tracks | Dashboard |
|--------|---------------|-----------|
| **Vercel Analytics** | Page views, performance (Web Vitals) | Vercel Dashboard |
| **Vercel Speed Insights** | Core Web Vitals (LCP, FID, CLS) | Vercel Dashboard |
| **Vercel Logs** | Server-side errors, API route failures | Vercel Dashboard → Logs |
| **Supabase Dashboard** | Database queries, connection pool, storage | Supabase Dashboard |
| **CreatorStore `/api/health`** | Custom health endpoint | JSON response |
| **CreatorStore `/super-admin/health`** | Platform metrics | Admin UI |

## Key Metrics to Watch

| Metric | Threshold | Action |
|--------|-----------|--------|
| Build failures | > 1 per day | Investigate stalled PRs |
| API error rate | > 1% | Check Vercel logs |
| Database connections | > 80% pool | Increase pool size |
| AI generation failures | > 10% | Check provider health |
| Payment webhook failures | > 0 | Investigate immediately |
| Page load (LCP) | > 2.5s | Optimize images, lazy load |

## Health Check Endpoint

```
GET /api/health
Response: { "status": "ok", "timestamp": "2026-07-21T00:00:00Z" }
```

Extend with:
- Database connectivity check
- Supabase storage connectivity
- Razorpay API health
- Social API health (YouTube, Instagram)

## Alerts (Recommended Setup)

| Alert | Trigger |
|-------|---------|
| Build failure | Vercel deploy fails |
| API error spike | > 50 errors in 5 min |
| DB connection pool near limit | > 80% utilization |
| Payment webhook failure | Any failed webhook delivery |
| Tenant provision failure | > 3 failures in 1 hour |

## Logging

- **Server actions:** Audit log via `logAction()` in `src/lib/audit.ts`
- **Content events:** EventBus in `src/lib/content/engine.ts`
- **Platform telemetry:** `platform.telemetry.counter/timer/histogram`
