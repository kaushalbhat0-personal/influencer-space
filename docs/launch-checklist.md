# Launch Checklist — RCCF-LAUNCH-TRACK-01

Final pre-launch verification across every surface.

## Marketing
- [x] Hero: what / who / differentiator / CTA in the first viewport
- [x] Pricing runtime-driven (Growth highlighted, enterprise separated, annual toggle, trial framing)
- [x] FAQ covers the 15-day trial + partner model
- [x] "Generate" copy replaced with "Build" where user-facing
- [ ] Mobile hero visual (roadmap)

## Pricing
- [x] Cards derive from the runtime (BillingPlan + registry fallback)
- [x] Most Popular (Growth) / Best Value (Scale) / Recommended (Solo) badges
- [x] Comparison auto-derived; hidden/enterprise excluded
- [x] Upgrade copy = exact next-tier additions

## Onboarding & generation
- [x] Stage-specific build copy (Learning about your brand, Setting up your workspace…)
- [x] "Build My Storefront" / "Building your storefront…" copy
- [x] Friendly error recovery ("We couldn't build your storefront. Try again.")
- [ ] `admin/create` wizard: stage list instead of a single "Building your website…" line (partial — copy improved)

## Builder
- [x] Loading fallback (no blank screen)
- [x] Save/autosave indicators, undo/redo, publish CTA
- [x] Creator-first right-panel labels (Suggested…, Website health)
- [ ] Mobile builder layout + touch targets (roadmap)

## Publishing
- [x] Atomic, versioned, rollback + change-pending flag
- [x] "Your site is ready" completion copy

## Storefront
- [x] ~19 queries/request; hero LCP eager+priority; remote hosts configured
- [x] No platform jargon in rendered output
- [ ] `loading.tsx` for `[domain]` (roadmap)

## Commerce
- [x] Products/orders/revenue empty states guide with a CTA
- [x] Checkout reads the runtime price; Razorpay-backed

## Agency
- [x] Import flow in plain language ("How it works")
- [x] Client management empty state with CTA
- [ ] Full mobile agency layout (roadmap)

## Super Admin
- [x] Consistent dark surface; pricing center analytics live
- [x] All destructive actions confirmed + audited (VALIDATION-04)
- [ ] Bulk actions + exports (VALIDATION-04 roadmap)

## Accessibility
- [x] `lang`, focus-visible, reduced-motion, skip links
- [x] Unlabeled close buttons fixed
- [ ] Tab-role pass + contrast QA sweep (roadmap)

## Performance / infra
- [x] Index migration authored (`20260807000000_scale_hardening_indexes`)
- [x] All caches bounded; storefront pipeline memoized
- [x] 3 crons registered; `DIRECT_URL` migrate path; storage policy tightened
- [ ] Apply the index migration on the direct connection (deploy checklist)

## Emails / assets
- [x] Email template audit documented (roadmap: branded templates)
- [ ] Capture demo screenshots + GIFs (needs a live build)

## Blocking checks (deploy day)
- [ ] Apply `20260807000000_scale_hardening_indexes` + `_billing_plan_marketing` + `_pricing_runtime` migrations on `DIRECT_URL`
- [ ] Drop the anon storage upload policy
- [ ] `sslmode=require` on both URLs; `HEALTH_SECRET` set
- [ ] `partner_growth` hidden; pricing runtime seeded (`Re-sync catalog`)
- [ ] Run `prisma migrate deploy`, `next build`, full test suite, Playwright e2e
