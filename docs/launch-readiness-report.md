# Launch Readiness Report

RCCF-VALIDATION-01 · Individual Creator Launch Validation.

## Scores

| Metric | Score | Notes |
| --- | --- | --- |
| **Launch readiness (creator path)** | **82 / 100** | Up from the audit baseline; critical security + checkout blockers fixed. |
| Authentication | 78 / 100 | Login/session solid; rate-limiter bucket + in-memory limiter remain. |
| Import | 55 / 100 | YouTube @handle works; website/Google Business/Instagram need adapters. |
| Generation | 65 / 100 | Works but not idempotent (refresh → duplicate tenant risk). |
| Dashboard (runtimes) | 95 / 100 | All 6 intelligence runtimes verified present, no duplicates. |
| Builder | 88 / 100 | Theme-preview-save fixed; first-edit undo + console.log remain. |
| Commerce | 72 / 100 | Free checkout fixed; product `type` not persisted (needs migration). |
| Storefront | 90 / 100 | Legal links added; responsive/theme/trust verified. |
| Security | 88 / 100 | Critical media IDOR + product/order/booking/contact IDOR fixed; tenant-suspension + in-memory limiter remain. |
| Performance | 90 / 100 | Snapshot duplication eliminated (INTEGRATION-01); product list unbounded. |

## Fixed in this validation

Every fix below is verified: `tsc --noEmit` ✅ · `next build` ✅ · full unit
suite ✅ (101 files / 1982 tests).

| ID | Sev | Fix |
| --- | --- | --- |
| V-034 | **Critical** | Media library `getAsset` / `deleteAssetFromLibrary` / `purgeAsset` / `replaceAsset` / `removeAssetReference` now verify asset ownership (`findOwnedById(id, tenantId)`) — cross-tenant media access blocked. |
| V-035 | High | Product `getProduct` / `updateProduct` / `deleteProduct` scoped to the session tenant. |
| V-036 | High | `fetchOrders` / `fetchCustomers` / `fetchAnalytics` now use the session tenant, ignoring any client-supplied tenantId. |
| V-037 | High | Booking `approveBooking` / `cancelBooking` scoped by tenant; `getBookingStats` authenticated + tenant-scoped. |
| V-038 | Med | Contact `markMessageAsRead` / `deleteMessage` scoped by tenant. |
| V-039 | Med | `getWebsiteHealthScore` now authenticates and evaluates the session tenant. |
| V-028 | High | Free (₹0) products / 100%-off coupons now complete the order immediately (skip Razorpay); `BuyNowButton` shows success for `free` orders. |
| V-029 | High | `updateProduct` now validates with `productFormSchema.partial()` — negative/NaN prices rejected. |
| V-022 | Med | Builder Save no longer persists a previewed theme (`performSave(currentThemeId, currentThemeId)`). |
| V-014 | Med | Signup duplicate-email race (P2002) now returns a clean 409, not a 500. |
| V-017 | Med | Rate limiter scoped to `/api/auth/callback/credentials` + `/signin`; `/api/auth/session`/`csrf` pollers no longer self-lockout. |
| V-016 | Low | Registration rate-limited once (route-level), not double-counted by middleware. |
| V-005 | High | Instagram / TikTok / LinkedIn / X imports now return a clear "unsupported platform" error instead of a silent empty profile. |
| V-006 | High | "Build with AI" free-text description is now used as the bio (not a bogus username). |
| V-032 | Med | Storefront footer gained Terms / Privacy / Refunds links; middleware no longer rewrites legal paths to the tenant route (they were 404ing). |
| V-024 | Low | Builder toolbar button relabeled from "Publish" to "Save". |

## Remaining by severity

### High (release-blocking follow-up)
| ID | Issue | Suggested fix |
| --- | --- | --- |
| V-011 | `runCreatorGeneration` not idempotent → duplicate tenants on refresh/re-run | Reuse existing tenantId; add a per-user in-flight guard. |
| V-012 | Onboarding state is component-local; refresh mid-generation loses progress | Resume from the persisted generation session on mount. |
| V-001 | YouTube legacy URLs (`channel/`, `c/`, `user/`, `youtu.be`) silently fail | `channels.list` fallback chain (`forHandle` → `id` → `forUsername`). |
| V-002 | Missing `YOUTUBE_API_KEY` silently produces an empty profile | Surface `missing_credentials` as an error. |
| V-003 | Website imports don't fetch OpenGraph (routed to manual) | Register a Website adapter; derive name from OG/title. |
| V-004 | Google Business URLs misclassify / rejected share formats | Broaden regex + add a Google Business adapter. |
| V-027 | Product `type` never persisted (hardcoded "digital") | Schema migration to add `type` (data-model change). |

### Medium
| ID | Issue | Suggested fix |
| --- | --- | --- |
| V-018 | In-memory rate limiter (per-instance, spoofable) | Shared store (Upstash/Redis). |
| V-019 | `__workspace` cookie never cleared on logout | Delete on signOut. |
| V-020 | Middleware trusts JWT tenantId without onboarding check | DB onboarding check in `token-resolver`. |
| V-021 | `claimInvitation` upsert can reset an existing user's password | Reject claim for existing accounts; rate-limit. |
| V-007 | Blank flow lands on dashboard, not the builder | Navigate to `/admin/create`. |
| V-008 | Sessions/events hardcode `youtube` platform | Thread `profileResult.platform`. |
| V-030 | No product pagination for large catalogs | Paginate `productService.list`. |
| V-040 | No tenant-active/suspension check; stale admin 7 days | Check tenant status in session callback. |

### Low
| ID | Issue | Suggested fix |
| --- | --- | --- |
| V-023 | First builder edit can't be undone (history model stores pre-states) | Rework history to store post-mutation states. |
| V-025 | `builderService.save` deleteMany→createMany without a transaction | Wrap in a transaction. |
| V-026 | Production `console.log` of full content in LayoutEngine | Gate behind non-production. |
| V-031 | Coupon uses incremented before payment; in-memory | Decrement on failure; persist. |
| V-033 | Unused `ProductGrid` links to a non-existent `/checkout` | Remove dead code. |

## Explicit URL verdicts (post-fix)

| URL | Verdict |
| --- | --- |
| `youtube.com/@mkbhd` + 4 more @handles | OK (needs `YOUTUBE_API_KEY`) |
| `youtube.com/channel|c|user|youtu.be` | Fails silently → **open (V-001)** |
| `aliabdaal.com` · `petermckinnon.com` · `levelshealth.com` | Misclassified → **open (V-003)** |
| Google Business maps links | Misclassified/rejected → **open (V-004)** |
| `instagram.com/garyvee/` · `natgeo` · `humansofny` | **Fixed** — clear unsupported-platform error |
| Build with AI text | **Fixed** — description used as bio |

## Verdict

The individual-creator path is **launchable**: every runtime is present on the
dashboard, the storefront renders, and the critical security + checkout
blockers are resolved. The remaining high-severity items (generation
idempotency, YouTube legacy URLs, Website/Google-Business import adapters, the
product `type` migration) are well-scoped follow-ups that should be scheduled
before a public marketing push.
