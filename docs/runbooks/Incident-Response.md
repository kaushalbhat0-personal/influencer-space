# Runbook: Incident Response

**Last updated:** July 2026
**Owner:** All Engineering

## Severity Levels

| Level | Definition | Response Time | Example |
|-------|-----------|---------------|---------|
| SEV-1 | Platform down, users cannot access | Immediate | Database offline |
| SEV-2 | Core feature broken | < 1 hour | AI generation fails |
| SEV-3 | Non-critical feature degraded | < 4 hours | Analytics delayed |
| SEV-4 | Minor bug | Next sprint | Typo in UI copy |

## Response Flow

1. **Detect** — Alert from monitoring, user report, or team observation
2. **Acknowledge** — Respond in team channel within SLA
3. **Triage** — Determine severity, assign owner
4. **Mitigate** — Stop the bleeding (rollback, feature flag disable, DB restore)
5. **Resolve** — Fix root cause
6. **Postmortem** — Document what happened, why, and prevention

## Common Incidents

### Database Connection Pool Exhaustion
- **Symptom:** Timeouts on all queries
- **Mitigation:** Increase pool size in Supabase dashboard. Check for connection leaks.
- **Prevention:** Set `connection_limit` in Prisma config. Monitor pool usage.

### Vercel Build Failure
- **Symptom:** Deploy fails, "Build failed" in Vercel dashboard
- **Mitigation:** Roll back to last good deploy. Fix build locally first.
- **Prevention:** Run `npm run build` locally before push. Use preview deployments.

### AI Generation Pipeline Failure
- **Symptom:** Generation returns errors for all URLs
- **Mitigation:** Verify providers are healthy. Check `healthCheck()` for each provider.
- **Prevention:** Add provider health checks to `/api/health`.

### Razorpay Checkout Failure
- **Symptom:** Payment popup doesn't open or returns error
- **Mitigation:** Verify API keys. Check webhook URL. Test in Razorpay dashboard.
- **Prevention:** Monitor `razorpayOrderId` creation in audit log.

## Escalation Contacts
- **Platform:** Platform Engineering Lead
- **AI Pipeline:** AI/ML Engineering Lead
- **Payments:** Backend Engineering Lead
- **Infrastructure:** DevOps / Vercel + Supabase dashboards

## Postmortem Template
```
# Incident Postmortem: [Title]
Date: [YYYY-MM-DD]
Severity: [SEV-1/2/3/4]
Duration: [X hours/minutes]
Owner: [Name]

## What happened
## Why it happened
## Impact (users, revenue, data)
## Timeline (detection → mitigation → resolution)
## Root cause
## Prevention (what we're changing)
```
