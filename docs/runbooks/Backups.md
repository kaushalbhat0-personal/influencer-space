# Runbook: Backups & Disaster Recovery

**Last updated:** July 2026
**Owner:** Platform Engineering

## Database (Supabase)

### Automatic Backups
- Supabase Pro: Daily backups, 7-day retention
- Point-in-time recovery (PITR): 7 days

### Manual Backup
```bash
# Dump schema + data
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d).sql

# Restore
psql "$DATABASE_URL" < backup-20260701.sql
```

### Data to Prioritize for Backup
1. **Tenant + User records** — Critical. Without these, creators lose access.
2. **Product + ProductOrder** — Financial data. Must be retained for compliance.
3. **Subscription records** — Billing history.
4. **AuditLog** — Compliance trail. Can be purged after 90 days.

## Storage (Supabase)

### File Storage
- Creator uploads stored in Supabase Storage buckets
- Buckets: `product-images`, `gallery`, `avatars`, `hero-media`
- Access via `@supabase/supabase-js` SDK

### Manual File Backup
```bash
# Download bucket contents (using Supabase CLI)
npx supabase storage download --bucket product-images
```

## Recovery Time Objective (RTO)
- **SEV-1** (database failure): < 2 hours via PITR restore
- **SEV-2** (corrupted data): < 4 hours via pg_dump restore
- **SEV-3** (accidental deletion): < 1 day via backup

## Recovery Point Objective (RPO)
- Production data: < 24 hours (daily backup)
- Financial data (ProductOrder): < 1 hour (webhook idempotency enables replay)

## Annual DR Test
1. Restore latest backup to staging database
2. Verify all models accessible
3. Run full test suite against restored database
4. Verify file storage integrity
