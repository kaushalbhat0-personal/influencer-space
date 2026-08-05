# Super Admin Platform Governance Audit — RCCF-AUDIT-04

**Date:** 2026-08-05
**Status:** COMPLETE — Read-Only Audit

---

## 1. Super Admin Capability Matrix

| Capability | Status | Notes |
|-----------|--------|-------|
| View users | ✅ | Read-only table, 200-row limit, client-side search/sort |
| Search users | ✅ | DataTable: name, email, role |
| Suspend user | ❌ | No action exists |
| Delete user | ❌ | Only via tenant cascade delete |
| Change user role | ❌ | No action exists |
| Impersonate user | ✅ (indirect) | Via tenant admin JWT login-as token |
| Reset password | ✅ (per tenant) | Resets tenant's ADMIN user password |
| View tenants | ✅ | Rich detail page: health, orders, activity, subscription |
| Delete tenant | ✅ | Hard delete + Vercel domain cleanup |
| Manage tenant plan | ✅ | STARTER/PRO toggle via Billing v2 |
| Tenant impersonation | ✅ | 5-min JWT login-as token |
| Content purge | ✅ | Delete all ContentFeedItems for tenant |
| View agencies | ✅ | Read-only list + detail with managed creators |
| Agency mutate | ❌ | No delete, suspend, or edit |
| Subscription upgrade/downgrade | ✅ | Via BillingService.adminSetPlan() |
| Subscription cancel/resume | ✅ | Server actions wired to UI |
| Complimentary plans | ❌ | No UI or action exists |
| Trial extensions | ❌ | No per-tenant trial extension |
| Subscription pause | ❌ | Only cancel/resume |
| Change plan prices | ❌ | Prices in config file, not DB-driven |
| Retire/launch plans | ❌ | Requires code change + Platform Registry Sync |
| Commission rate config | ✅ | 5 percentage fields from UI |
| Billing defaults config | ✅ | 7 fields: currency, trial, grace, invoice prefix, auto-renew, refund, proration |

---

## 2. Subscription Governance

Plans flow from `src/config/commerce/plans.ts` → `lib/capabilities/plans.ts` → `resolvePlan()` → runtime. **No hardcoded prices in UI.** The `adminSetPlan` server action writes Billing v2 and calls `billingService.adminSetPlan()`.

The Subscriptions page shows all tenants with current plan + status. The tenant-ledger has a plan override modal.

---

## 3. Deletion Dependency Graph

### Cascade chain when Tenant.delete() fires:

```
Tenant.delete()
 ├── Website → Brand, PublishStatus → PublishSnapshot, Page → Section → Block
 ├── User → WorkspaceMember, ClientAssignment
 ├── Product → ProductOrder
 ├── AffiliateLink, GalleryImage, TimelineEvent, Game
 ├── Setting, ContactSubmission, NewsletterSubscriber
 ├── Subscription (legacy), ProductOrder, SocialStats
 ├── AuditLog, ContentFeedItem
 ├── Asset → AssetReference
 ├── DesignTheme
 ├── Offering → Purchase
 ├── Booking
 ├── Workflow → WorkflowExecution
 ├── AgencyTenant
 └── ClientAssignment

Workspace → tenantId SetNull (orphaned)
BillingSubscription → workspaceId SetNull
BillingEvent → workspaceId SetNull
BillingInvoice → workspaceId SetNull
```

**52 CASCADE relationships. 7 SetNull relationships. No Restrict/NoAction.**

---

## 4. Orphan Analysis

| Risk | Severity | Details |
|------|----------|---------|
| **Orphaned Workspaces** | Medium | tenantId set NULL on delete; slug conflict risk on reuse |
| **Orphaned Billing Data** | Medium | BillingAccount not FK-linked to Tenant; BillingSub/Event/Invoice lose workspace |
| **Stale CreatorImport rows** | Low | `CreatorImport.tenantId` is loose string, not FK-constrained |
| **Stale AnalyticsEvent rows** | Low | `AnalyticsEvent.tenantId` is loose string |
| **ProviderAccount orphans** | Low | No FK to tenant at all |

**No cleanup service exists.** The only cleanup code is application-level:
- Asset soft-delete (`status = "DELETED"`)
- GenerationCleanup (cache invalidation, not exposed in UI)
- Media cleanup (not exposed in UI)

---

## 5. Commission Governance

| Control | Status | Priority |
|---------|--------|----------|
| Platform commission % | ✅ Configurable from UI | N/A |
| Partner commission % | ✅ Configurable from UI | N/A |
| Per-plan override | ❌ | High |
| Per-partner override | ❌ | High |
| Per-creator override | ❌ | Medium |
| Promotional overrides | ❌ | Low |

The commission hierarchy should be:

```
Creator Override → Partner Override → Plan Default → Platform Default
```

Currently only the Platform Default level exists via the 5-field config.

---

## 6. AI Governance — Missing

| Feature | Status |
|---------|--------|
| Generation queue UI | ❌ Counts shown, no management |
| Prompt version management | ❌ `PromptRegistry` exists backend, no UI |
| Provider configuration | ❌ Keys in env vars only |
| Cost tracking | ❌ Marked "untracked" |
| Generation recovery | ❌ Backend code exists, not in UI |
| Generation cleanup | ❌ Backend code exists, not in UI |
| Generation retention | ❌ Config exists, no UI |

---

## 7. Cleanup Runtime — Missing

| Tool | Status |
|------|--------|
| Nightly cleanup job | ❌ `"cleanup"` job type defined but not registered |
| Garbage collector | ❌ |
| Orphan repair | ❌ |
| Integrity checker | ❌ |
| Dedicated cleanup page | ❌ |

---

## 8. Feature Flags — 5 total

```
enableYouTubeSync, enableInstagramSync, enableTwitchSync,
enableNewRegistrations, maintenanceMode
```

All boolean toggles stored in `Setting` table.

---

## 9. Recommended Implementation Roadmap

| Priority | Feature | RCCF |
|----------|---------|------|
| **Critical** | Nightly cleanup job for orphaned records | 56.2 |
| **Critical** | Safe user deletion (soft-delete + cascade verify) | 56.2 |
| **High** | Per-partner commission overrides | 57 |
| **High** | Per-creator commission overrides | 57 |
| **High** | Plan lifecycle management (launch/retire from UI) | 57 |
| **High** | Complimentary plans + trial extensions | 57 |
| **Medium** | AI governance dashboard (prompts, costs, models) | 58 |
| **Medium** | Generation queue management UI | 58 |
| **Medium** | Expose backend cleanup/recovery tools in UI | 58 |
| **Low** | Per-plan pricing UI (config-driven) | 59 |
| **Low** | Generate cleanup/GC page | 59 |
| **Low** | DB integrity checker page | 59 |
