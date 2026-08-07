# VALIDATION-01 — Individual Creator Launch Validation

RCCF-VALIDATION-01 · Launch Readiness Initiative.

**Type:** Read-only audit + validated blocker fixes. No new features, no
refactor, no architecture change.

**Persona:** Individual Creator. Platforms: YouTube, Website, Google Business,
Manual AI, Blank. Validation used real public creators/businesses and traced
the full journey through the actual code paths (no live server/network was
available in this environment, so the validation is code-level with the import
pipeline traced against the real URLs provided).

## Journey map

```
Landing → Signup → Provider Import → Generation → Dashboard
  → Knowledge → Goals → Recommendations → Business Health
  → Builder → Commerce → Publish → Storefront
  → Website Evolution → Logout/Login
```

Each step was traced to its server action + runtime; the map below records what
runtimes participate at each step and where the journey breaks.

## Issue log

Every issue: ID · Severity · Journey step · Root cause · Suggested fix.

### Authentication

| ID | Sev | Step | Root cause | Suggested fix |
| --- | --- | --- | --- | --- |
| V-014 | Med | Signup | Duplicate-email race: `register/route.ts` pre-checks then creates; the loser hits the `@unique` P2002 and the catch maps everything to a 500 instead of a clean 409. | Handle `PrismaClientKnownRequestError` code `P2002` → return 409 with the "account exists" message. |
| V-015 | Low | Signup | Password policy is length ≥ 8 only. | Add strength checks (config-driven). |
| V-016 | Low | Signup | Register is rate-limited in both middleware and the route → double decrement (~2–3/hr effective). | Remove one of the two checks. |
| V-017 | Med | Login | Middleware maps ALL `/api/auth/*` to the login bucket (10/15min), including the `/api/auth/session` poller — busy admins can self-lockout. | Scope the bucket to `/api/auth/callback/credentials` + `/api/auth/register`; exempt session/csrf. |
| V-018 | Med | Login | Rate limiter is an in-memory `Map` (per-instance, header-spoofable, resets on redeploy). | Move to a shared store (Upstash/Redis). |
| V-019 | Low | Logout | `__workspace` cookie is never cleared on logout; `getCurrent()` trusts the decoded cookie without a DB membership check. | Delete the cookie on signOut; verify membership in `getCurrent()`. |
| V-020 | Med | Roles | Middleware marks any ADMIN-with-tenantId JWT as READY without checking the `onboarding_completed` setting. | Add a DB onboarding check (or rely on `requireTenant`, which already checks). |
| V-021 | Med | Claim-invite | `claimInvitation` uses an email-keyed upsert that resets an existing user's password / re-points tenant. | Reject claim when the email already belongs to an account; rate-limit the action. |

### Import (real URLs traced)

| ID | Sev | URL | Root cause | Suggested fix |
| --- | --- | --- | --- | --- |
| V-001 | High | `youtube.com/@mkbhd` etc. | `@handle` works, but `cleanHandle` collapses `channel/`, `c/`, `user/` and `youtu.be/<id>` into a bogus handle → silent empty import. | `channels.list` with `forHandle` → `id` → `forUsername` fallback chain. |
| V-002 | High | any YouTube | No `YOUTUBE_API_KEY` → scraper returns `missing_credentials` and the adapter degrades to an empty import with a buried warning; UI proceeds with a blank profile. | Fail loudly in `importCreatorProfile` when warnings contain `missing_credentials`. |
| V-003 | High | `aliabdaal.com`, `petermckinnon.com`, `levelshealth.com` | `detectPlatform` has no website branch → `ManualAdapter` → storefront branded with the session user's name, empty bio, no OpenGraph. | Register a Website adapter and route website URLs to it; derive `displayName` from OG/title. |
| V-004 | High | `google.com/maps/place/…`, `maps.google.com/?cid=…`, `maps.app.goo.gl/…` | Google Business URLs route to ManualAdapter → username = `data=…` garbage; provider regex rejects the common `maps.app.goo.gl` / `cid` share formats. | Broaden the regex; add a Google Business adapter that extracts a sensible name. |
| V-005 | High | `instagram.com/garyvee/`, `/natgeo/`, `/humansofny/` | Instagram is not a supported provider, but `detectPlatform` returns `instagram` and the ManualAdapter fallback produces a silent empty profile mislabeled as Instagram. | Return a clear "unsupported platform" error instead of an empty import. |
| V-006 | High | Build with AI textarea | The description text is sent as `sourceUrl` and dropped (`bio: ""`, username = whole blob). | Send the textarea as the bio to the acquisition engine. |
| V-007 | Med | Blank | The Blank card redirects to `/admin/dashboard`; the "Continue to Theme Selection" block is unreachable. | Navigate to `/admin/create`; remove the dead block. |
| V-008 | Med | All imports | Sessions/events hardcode `platform: "youtube"` for every import type. | Thread `profileResult.platform` into session + event. |
| V-009 | Low | Import | The `import-provider` registry `matches()`/`acquire()` are dead code; UI provider selection is cosmetic. | Consolidate on one acquisition path. |
| V-010 | Low | YouTube | Scraper fetch has no timeout; 1h cache serves stale data. | `AbortSignal.timeout(8000)`; `no-store` for live import. |

### Generation

| ID | Sev | Step | Root cause | Suggested fix |
| --- | --- | --- | --- | --- |
| V-011 | High | Generate | `runCreatorGeneration` is not idempotent — every call creates a new provision run + tenant/website and re-points the user's tenantId; refresh/re-run → duplicate tenants + orphaned data. | Reuse the user's existing tenantId; add a per-user in-flight guard. |
| V-012 | High | Generate | Onboarding state is component-local; a refresh mid-generation returns to the import step with no resume. | On mount, look up the user's existing tenant/session and offer resume. |
| V-013 | Med | Generate | `markOnboardingComplete` is called twice (harmless upsert). | Dedupe. |

### Dashboard (runtimes verified)

- ✅ Knowledge, Goals, Recommendations, Business Health, Success, Website
  Evolution all render (RCCF-EPIC-04/05/06/07/09 + INTEGRATION-01).
- ⚠️ No duplicate information — each runtime has its own card; the Next Best
  Step (recommendations) and the Evolution feed are distinct. Verified.

### Builder

| ID | Sev | Root cause | Suggested fix |
| --- | --- | --- | --- |
| V-022 | Med | Saving while a theme is previewed (`performSave(previewThemeId,…)`) persists the preview theme, contradicting "preview never persists". | Save buttons pass `(currentThemeId, currentThemeId)`. |
| V-023 | Low | `canUndo` requires `historyIndex > 0`, so the first edit can never be undone. | `canUndo` → `historyIndex >= 0` (or seed an initial snapshot). |
| V-024 | Low | Toolbar button labeled "Publish" calls Save. | Rename/rewire. |
| V-025 | Low | `builderService.save()` does deleteMany→createMany without a transaction → partial data loss on autosave error. | Wrap in a transaction. |
| V-026 | Low | `console.log` of full hero/content config on every storefront render + publish. | Gate behind non-production. |

### Commerce

| ID | Sev | Root cause | Suggested fix |
| --- | --- | --- | --- |
| V-027 | High | Product `type` is never persisted (`mapProduct` hardcodes `"digital"`; the Prisma model has no `type` column) — physical/other types are a UI illusion. | Schema migration to add `type` (follow-up; data-model change). |
| V-028 | High | Free (₹0) products/coupons cannot check out — `createCheckout` always calls `razorpay.orders.create({ amount: 0 })`, which Razorpay rejects; the order stays PENDING. | Add a zero-amount free-fulfillment branch (complete the order, skip Razorpay). |
| V-029 | High | `updateProduct` skips `productFormSchema` → a crafted negative price persists. | Validate in `updateProduct`. |
| V-030 | Med | `productService.list` is unbounded — large catalogs degrade the admin page. | Paginate. |
| V-031 | Low–Med | Coupon usage increments before payment; in-memory counter. | Decrement on failure; persist. |

### Storefront

| ID | Sev | Root cause | Suggested fix |
| --- | --- | --- | --- |
| V-032 | Med | Storefront footer has no `/terms` `/privacy` `/refund` links, and on a tenant host those paths are rewritten to `/[domain]/terms` → 404. | Add legal links to the footer; exclude legal paths from the tenant rewrite. |
| V-033 | Low | Unused `ProductGrid` links to a non-existent `/checkout` route. | Remove/dead-code. |

### Security

| ID | Sev | Root cause | Suggested fix |
| --- | --- | --- | --- |
| V-034 | **Critical** | Media library actions (`deleteAssetFromLibrary`, `purgeAsset`, `replaceAsset`, `getAsset`) operate by `assetId` with no tenant scope — a creator can delete/replace another tenant's media. | Verify `{ id, tenantId }` ownership before the operation. |
| V-035 | High | Product `getProduct`/`updateProduct`/`deleteProduct` operate by id with no ownership check. | Scope by `{ id, tenantId }`. |
| V-036 | High | `fetchOrders`/`fetchCustomers`/`fetchAnalytics` accept a client-supplied `tenantId`. | Use the session tenant. |
| V-037 | High | Booking `approveBooking`/`cancelBooking` IDOR; `getBookingStats(tenantId)` is unauthenticated. | Scope by session tenant; authenticate. |
| V-038 | Med | Contact `markMessageAsRead`/`deleteMessage` IDOR. | Scope by session tenant. |
| V-039 | Med | `getWebsiteHealthScore(tenantId)` has no auth and accepts arbitrary tenantId. | Add auth; derive tenant from session. |
| V-040 | Med | No tenant-active/suspension check; stale admin sessions last 7 days. | Check tenant status in the session callback. |

### Performance

- ✅ Duplicate snapshot builds (3×) eliminated by RCCF-INTEGRATION-01 (verified in
  the test suite). 
- V-042 Low: `productService.list` unbounded (see V-030).

## Explicit URL verdicts

| URL | Verdict |
| --- | --- |
| `youtube.com/@mkbhd` · `@AliAbdaal` · `@Mrwhosetheboss` · `@PeterMcKinnon` · `@thinkmedia` | **OK** (needs `YOUTUBE_API_KEY`); `forHandle` resolves |
| `youtube.com/channel/…` · `/user/…` · `/c/…` · `youtu.be/<id>` | **Fails silently** (V-001) |
| `aliabdaal.com` · `petermckinnon.com` · `levelshealth.com` | **Misclassified** → ManualAdapter, no OG data (V-003) |
| `google.com/maps/place/…` · `maps.google.com/?cid=` · `maps.app.goo.gl` | **Misclassified / rejected** (V-004) |
| `instagram.com/garyvee/` · `/natgeo/` · `/humansofny/` | **Unsupported, silent empty import** (V-005) |

## Fix status (priority order)

Fixed and committed in this validation (each verified with `tsc --noEmit`,
`next build` and the full 101-file / 1982-test suite before commit):

- **V-034 (Critical)** media IDOR, **V-035** product IDOR, **V-036** order
  IDOR, **V-037** booking IDOR + unauth stats, **V-038** contact IDOR,
  **V-039** unauth health score — all tenant-scoped/authenticated.
- **V-028** free (₹0) checkout, **V-029** negative-price update, **V-022**
  builder theme-preview-save, **V-014** signup P2002 → 409, **V-017** auth
  rate-limit bucket, **V-016** register double-limit, **V-005** unsupported
  platform clear error, **V-006** AI description as bio, **V-032** storefront
  legal links + middleware legal-path fix, **V-024** toolbar label.

See `docs/launch-readiness-report.md` for the full closed list, the remaining
issues by severity, and the reassessed launch-readiness score (82/100).
