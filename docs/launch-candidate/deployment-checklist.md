# Deployment Checklist — CreatorStore Launch

**Date:** 2026-08-05

---

## Pre-Deployment

### Code Quality
- [x] `tsc --noEmit` passes (0 errors)
- [x] `next build` passes
- [x] All 94 test files pass (1876 tests)
- [x] Dead code cleaned (18 files removed)
- [x] No legacy plan names in UI
- [x] No hardcoded prices

### Environment Variables
- [ ] `VERCEL_API_TOKEN` set in Vercel dashboard
- [ ] `VERCEL_PROJECT_ID` set in Vercel dashboard
- [ ] `NEXT_PUBLIC_APP_URL` set (e.g., `https://creatorstore.app`)
- [ ] `NEXTAUTH_SECRET` set (64+ char random string)
- [ ] `DATABASE_URL` set (Supabase PostgreSQL connection string)
- [ ] `RAZORPAY_KEY_ID` set
- [ ] `RAZORPAY_KEY_SECRET` set
- [ ] `NEXT_PUBLIC_PLATFORM_BASE_DOMAIN` set

### Database
- [ ] Supabase migration applied (latest)
- [ ] Prisma client generated (`npx prisma generate`)
- [ ] Billing catalog seeded (`seedBillingCatalog()`)
- [ ] Commission engine initialized
- [ ] CommissionPolicy defaults set (via Super Admin UI)

### Razorpay
- [ ] Razorpay webhook URL configured in Razorpay dashboard
- [ ] Webhook secret matches `RAZORPAY_WEBHOOK_SECRET`
- [ ] Plans created in Razorpay:
  - [ ] Creator Grow (plan_TLTGQBU1EXkseF)
  - [ ] Creator Scale (plan_TLTH45wQlPdW7v)
  - [ ] Solo Partner (plan_solo)
  - [ ] Partner Growth (plan_growth)
  - [ ] Partner Scale (plan_scale)

### Vercel
- [ ] Custom domain configured for platform (`creatorstore.app`)
- [ ] Domain verified + SSL active
- [ ] Cron jobs configured in `vercel.json`

---

## Deployment Steps

1. **Push to main** — CI/CD deploys to Vercel production
2. **Verify build** — Check Vercel deployment logs for errors
3. **Run Playwright R25** — Verify all creator journeys
4. **Check webhooks** — Test Razorpay webhook connectivity
5. **Verify domain** — Test custom domain attachment flow
6. **Check billing** — Complete a test subscription checkout
7. **Check storefront** — Publish a test site, verify live URL
8. **Check analytics** — Verify page loads with real data

---

## Post-Deployment

### Monitoring
- [ ] Watch Vercel deployment health
- [ ] Watch Supabase database health
- [ ] Watch Razorpay webhook delivery rate
- [ ] Set up Sentry/error tracking for production

### Rollback Plan
If critical issues found:
1. Revert to previous commit in Vercel dashboard
2. OR: `git revert HEAD` + push

### Recovery
- Database: Supabase point-in-time recovery
- Files: Vercel Git integration auto-deploys on push
- Webhooks: Razorpay dashboard has retry + manual trigger

---

## Post-Deployment Verification

- [ ] Creator signup flow works (email + password)
- [ ] AI onboarding generates storefront from profile URL
- [ ] Theme marketplace loads, filter + apply works
- [ ] Builder renders sections, drag-drop works
- [ ] Domain attachment + Vercel verification works
- [ ] Billing checkout creates Razorpay subscription
- [ ] Products/Services/Bookings CRUD works
- [ ] Storefront publishes to live URL
- [ ] Partner import + invite flow works
- [ ] Super Admin revenue/finance/settlements pages load
- [ ] Mobile responsive (all pages tested at 375px)
- [ ] Keyboard navigation works on all pages
- [ ] No hydration warnings in console
