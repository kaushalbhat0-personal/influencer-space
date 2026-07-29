# Release Certification Checklist

> **Scope:** Required before every `git tag -a v*.*.*`
> **Duration:** 30-60 minutes
> **Owner:** Release Manager

---

## Pre-Certification

- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Build succeeds: `npm run build`
- [ ] Unit tests pass: `npm run test`
- [ ] RC audit document created

---

## Level 1 — Smoke Suite

- [ ] Creator login → Dashboard
- [ ] Agency login → Dashboard
- [ ] Super Admin login → Dashboard
- [ ] Builder loads
- [ ] Storefront renders
- [ ] Super Admin: Themes, Templates, Activity, Insights, Revenue Management
- [ ] Invalid login rejected

## Level 2 — Regression Suite

- [ ] Full Creator Journey (template → theme → generate → builder → publish → storefront)
- [ ] Full Agency Journey (clients → generate → assign → publish → portal)
- [ ] Agency Team Member (My Work → Builder → Permissions)
- [ ] Client Portal (Health → Publishing → Support)
- [ ] Super Admin (all 30+ routes operational)
- [ ] Billing (subscriptions, invoices, revenue metrics)
- [ ] Security (401/403, role isolation, cross-tenant)
- [ ] Marketplace (themes, templates, search, filters)

## Level 3 — Release Certification

- [ ] All Level 1 + 2 passing
- [ ] Responsive layouts verified (desktop, tablet, mobile)
- [ ] Accessibility scan passes (keyboard, contrast, ARIA)
- [ ] Performance benchmarks met (dashboard < 3s, builder < 5s, storefront < 2s)
- [ ] Error handling (404, 500, invalid IDs, expired sessions)
- [ ] Workspace isolation (cross-tenant access denied)
- [ ] Publishing pipeline (draft → publish → preview → rollback)
- [ ] All 6 personas certified

---

## Final Checks

- [ ] Playwright suite passes: `npm run test:e2e:ci`
- [ ] No skipped or disabled tests
- [ ] HTML report generated
- [ ] JUnit XML generated
- [ ] Screenshots/videos reviewed
- [ ] Release candidate audit signed off

## Gate

> **If any item is unchecked, the release must not be tagged.**
> Fix the issue, re-run certification, and re-check.
