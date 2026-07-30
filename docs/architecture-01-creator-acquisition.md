# ARCHITECTURE-01: Creator Acquisition & Provisioning Audit

**Date:** 2026-07-30  
**Status:** Audit Complete — Blueprint Ready  

---

## Phase 1 — Current Flow Diagram

```
Super Admin UI (ProvisionModal)
  │
  ├── ImportSource selection (youtube / manual / demo_seed)
  │     └── CreatorImportAdapter.analyze(input)
  │           └── CreatorProfile
  │
  └── importCreator(source, input, profile)
        │
        ├── provisioningService.createRun()
        │
        ├── provisioningService.provision(CreatorProfile data)
        │     └── $transaction:
        │           Tenant, Website, Brand, PublishStatus,
        │           Settings, User, Workspace, WorkspaceMember
        │
        ├── publishingService.publish(tenantId)
        │     └── PublishSnapshot, Pages, Sections, Blocks
        │
        └── Return { success, tenantId, storefrontUrl }
```

### Files Involved

| Layer | Files |
|-------|-------|
| UI | `app/super-admin/_components/provision-modal.tsx` |
| UI (Preview) | `components/import/ImportPreview.tsx` |
| Server Action | `actions/import.actions.ts` |
| Adapter Interface | `lib/import/types.ts` |
| Adapters | `lib/import/adapters/{index,demo-seed,manual,youtube}.ts` |
| Services | `services/youtube-scraper.service.ts` |
| Provisioning | `modules/provisioning/application/provisioning-service.ts` |
| Publishing | `lib/publishing/service.ts` |
| Onboarding UI | `app/onboarding/page.tsx` |
| Lifecycle | `lib/lifecycle/service.ts` |

---

## Phase 2 — YouTube-Specific Assumptions

### UI Layer

| Location | Assumption | Impact |
|----------|-----------|--------|
| `provision-modal.tsx:116` | Source icons mapped by `ImportSource` | New sources need icon mapping |
| `provision-modal.tsx:147` | Placeholder "youtube.com/@channel" | Hardcoded per-source |
| `onboarding/page.tsx:53-61` | `detectClientPlatform()` URL regex | Only YouTube/Instagram/TikTok |

### Business Logic

| Location | Assumption | Impact |
|----------|-----------|--------|
| `youtube.ts:132-173` | `inferProducts(title)` infers from YT channel title keywords | Not applicable for non-YouTube sources |
| `youtube.ts:38-40` | YouTube URL regex validation | Source-specific |
| `youtube.ts:18-27` | `extractHandle()` YouTube-specific | Source-specific |

### Provider Layer

| Location | Assumption | Impact |
|----------|-----------|--------|
| `youtube.ts:53-55` | Calls `YouTubeScraperService.fetchChannelMetadata()` | Requires YouTube API |
| `youtube.ts:3-11` | Dynamic import of YouTube scraper | Service discovery per source |

### Database Layer

| Table | YouTube-Specific | Generalizable |
|-------|-----------------|---------------|
| `CreatorImport` | Channel-based imports | ✅ Already general |
| `CreatorProfile` | Intelligence data | ✅ Already general |
| `ProviderAccount` | `youtubeChannelId`, `twitchChannelId` | ⚠️ Provider-specific fields |
| `SocialStats` | YouTube subscriber/views | ⚠️ Source-specific schema |
| `YouTubeQuotaUsage` | **Fully YouTube-specific** | ❌ New table per provider |

---

## Phase 3 — Canonical CreatorProfile

### Current `CreatorProfile` Interface (`lib/import/types.ts`)

| Field | Required | Optional | Derived | Source |
|-------|----------|----------|---------|--------|
| `source` | ✅ | | | Provider |
| `creatorName` | ✅ | | | All |
| `brandName` | ✅ | | | All |
| `tagline` | | ✅ | | Social/channel |
| `bio` | | ✅ | | Social/channel |
| `heroTitle` | | ✅ | | Generated |
| `aboutText` | | ✅ | | Social/channel |
| `tone` | | ✅ | | Inferred |
| `niche` | | ✅ | | Inferred |
| `audience` | | ✅ | | Inferred |
| `products` | | ✅ | | All |
| `services` | | ✅ | | All |
| `socialLinks` | | ✅ | | Provider |
| `seoTitle` | | ✅ | | Generated |
| `seoDesc` | | ✅ | | Generated |
| `palette` | | ✅ | | Inferred |
| `logoUrl` | | ✅ | | Social/channel |
| `faq` | | ✅ | | Manual/AI |
| `testimonials` | | ✅ | | Manual/AI |
| `pages` | | ✅ | | Default |
| `channelId` | | ✅ | **YouTube-only** | ❌ Source-specific |

**Recommendation:** The interface is already well-generalized. Remove `channelId` or make it part of a provider-specific metadata map.

---

## Phase 4 — Provider Audit

| Source | Existing Adapter | DB Tables | Scraping/API | Profile Coverage |
|--------|-----------------|-----------|--------------|------------------|
| YouTube | ✅ `YouTubeAdapter` | `ProviderAccount`, `YouTubeQuotaUsage` | YouTube Data API | Full |
| Manual | ✅ `ManualAdapter` | None needed | None | Minimal |
| Demo Seed | ✅ `DemoSeedAdapter` | None needed | None | Full (seeded) |
| Instagram | ⚠️ Source type exists | None | Instagram Graph API | Not implemented |
| Twitch | ⚠️ Source type exists | None | Twitch API | Not implemented |
| TikTok | ⚠️ Source type exists | None | TikTok API | Not implemented |
| LinkedIn | ❌ | None | LinkedIn API | Not implemented |
| Website URL | ⚠️ Source type exists | None | Scraper | Not implemented |
| AI Generation | ❌ | None | AI service | Not implemented |

---

## Phase 5 — Provisioning Independence

**Verdict: Provisioning is already independent of YouTube.**

The `ProvisioningInput` type (`provisioning-service.ts:24-49`) accepts:

```ts
export interface ProvisioningInput {
    creatorName: string;
    sourceUrl?: string;
    sourcePlatform?: string;
    templateId?: string;
    strategyId?: string;
    generatedContent?: { ... };
    generatedTheme?: { ... };
}
```

**No YouTube-specific fields.** The `importCreator()` action maps `CreatorProfile` → `ProvisioningInput` in `import.actions.ts:62-79`. Only `creatorName`, `generatedContent`, and `generatedTheme` from the profile are passed. The pipeline never accesses YouTube data directly after the adapter returns a `CreatorProfile`.

**The provisioning pipeline is fully source-agnostic.**

---

## Phase 6 — UI Audit

| Screen | File | Assumptions | Changes Required |
|--------|------|-------------|-----------------|
| Source selection | `provision-modal.tsx` | Grid of source buttons | Register adapters dynamically |
| Input field | `provision-modal.tsx` | URL/name input per source | Dynamic label/placeholder per adapter |
| Analysis | `provision-modal.tsx` | Calls `analyzeCreatorImport` | Already generic |
| Preview | `ImportPreview.tsx` | Shows profile data | Already generic |
| Onboarding | `onboarding/page.tsx` | URL input, platform detection | Needs multi-source support |

---

## Phase 7 — Database Schema Audit

| Table | Classification | YouTube-Specific |
|-------|---------------|-----------------|
| `Tenant` | Platform | No |
| `Website` | Platform | No |
| `Brand` | Platform | No |
| `User` | Platform | No |
| `Workspace` | Provisioning | No |
| `PublishStatus` | Publishing | No |
| `PublishSnapshot` | Publishing | No |
| `Page` / `Section` / `Block` | Storefront | No |
| `Setting` | Platform | No |
| `BillingPlan` | Platform | No |
| `CreatorProvisionRun` | Provisioning | No |
| `CreatorProvisionEvent` | Provisioning | No |
| `ProviderAccount` | Provider | **Has `youtubeChannelId`, `twitchChannelId`** |
| `ProviderFetchLog` | Provider | No |
| `YouTubeQuotaUsage` | Provider | **Fully YouTube-specific** |
| `CreatorProfile` / `CreatorIntelligence` | Provisioning | No |
| `SocialStats` | Provider | **Source-specific columns** |

**Recommendation:** Generalize `ProviderAccount` with a `provider` type discriminator and a `metadata` JSON field instead of per-provider columns.

---

## Phase 8 — API/Services Audit

| Service | Provider-Specific | General |
|---------|------------------|---------|
| `youtube-scraper.service.ts` | ✅ YouTube Data API | — |
| `import.actions.ts` | — | ✅ Source-agnostic |
| `provisioning-service.ts` | — | ✅ Source-agnostic |
| `publishing/service.ts` | — | ✅ Source-agnostic |
| `onboarding.actions.ts` | — | ✅ Source-agnostic |
| `lifecycle/service.ts` | — | ✅ Source-agnostic |

**Only the scraper/analysis layer is provider-specific.** Everything downstream is source-agnostic.

---

## Phase 9 — Future Architecture

```
Creator Source (YouTube URL / Instagram / Manual / AI / TikTok / ...)
        │
        ▼
┌─────────────────────────────────────────────┐
│           CreatorImportAdapter               │
│  (per-provider implementation)              │
│                                              │
│  validate(input) → { valid, error }          │
│  analyze(input) → CreatorProfile             │
└──────────────────────────┬──────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────┐
│           CreatorProfile (canonical)         │
│  Source-agnostic data contract               │
│  Fields: creatorName, brandName, tagline,    │
│          bio, products, socialLinks, ...      │
│  No provider-specific fields                 │
└──────────────────────────┬──────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────┐
│           importCreator()                   │
│  Maps CreatorProfile → ProvisioningInput    │
│  Calls provisioningService.provision()      │
│  Calls publishingService.publish()          │
│  No YouTube-specific code                   │
└──────────────────────────┬──────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────┐
│           Provisioning Pipeline              │
│  $transaction: Tenant, Website, User,        │
│  Workspace, Brand, Settings, Products, ...   │
│  Source-agnostic                             │
└──────────────────────────┬──────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────┐
│           Publishing Pipeline                │
│  PublishSnapshot, Pages, Sections, Blocks    │
│  Source-agnostic                             │
└──────────────────────────┬──────────────────┘
                           │
                           ▼
                     Storefront
```

### Provider Contract

```ts
interface CreatorImportAdapter {
    source: ImportSource;
    label: string;
    description: string;
    icon?: LucideIcon;
    validate(input: string): { valid: boolean; error?: string };
    analyze(input: string): Promise<ImportAnalysisResult>;
}
```

---

## Phase 10 — Migration Blueprint

### Required Refactors (No Breaking Changes)

| # | Refactor | Impact | Effort |
|---|----------|--------|--------|
| 1 | Add `icon` to `CreatorImportAdapter` interface | Low — optional field | 1h |
| 2 | Generalize `ProviderAccount` — add `provider` enum + `metadata` JSON | Medium — schema migration | 4h |
| 3 | Rename `channelId` to `providerId` in `CreatorProfile` | Low — single field | 30m |
| 4 | Add Instagram adapter | Medium — API integration | 8h |
| 5 | Add TikTok adapter | Medium — API integration | 8h |
| 6 | Add AI generation adapter | High — AI prompt engineering | 16h |
| 7 | Update UI to render adapters dynamically from registry | Low — already dynamically listed | 2h |

### Breaking Changes

| # | Change | Mitigation |
|---|--------|-----------|
| 1 | Remove `channelId` from `CreatorProfile` | Add `providerId` as replacement, deprecated field |
| 2 | Rename `youtubeChannelId` in `Tenant` table | Add `providerAccounts` relation instead |
| 3 | Separate `YouTubeQuotaUsage` into generic `ProviderQuotaUsage` | Create new table, migrate data |

### Implementation Order

```
Phase 1 — Foundation (Week 1)
  ├── Add icon + category to CreatorImportAdapter interface
  ├── Add providerId to CreatorProfile (deprecate channelId)
  └── Generalize UI to render adapters dynamically with icons

Phase 2 — Schema (Week 2)
  ├── Generalize ProviderAccount with provider + metadata
  ├── Create ProviderQuotaUsage (replaces YouTubeQuotaUsage)
  └── Add migration scripts

Phase 3 — New Providers (Week 3-4)
  ├── Instagram adapter
  ├── TikTok adapter  
  └── AI Generation adapter (LLM-based)

Phase 4 — Polish (Week 5)
  ├── Update onboarding page for multi-source
  ├── Add provider-specific preview components
  └── Documentation
```

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| YouTube API quota exceeded | Medium | High | Implement caching + fallback to manual |
| Instagram API changes | Medium | Medium | Abstract API layer, handle gracefully |
| TikTok API access restrictions | High | Medium | Use manual fallback |
| AI generation quality varies | Medium | Medium | Human review step before provisioning |
| Schema migration breaks existing data | Low | High | Test in staging, backup before migrate |

---

## Architecture Assessment

**The current architecture is already well-separated.** The adapter pattern (`CreatorImportAdapter`) correctly isolates provider-specific logic. The provisioning pipeline is fully source-agnostic. The main work to support multi-source acquisition is:

1. **Implement adapters** for each new source (Instagram, TikTok, AI, etc.)
2. **Generalize two tables** (`ProviderAccount`, `YouTubeQuotaUsage`) 
3. **Update the UI** to dynamically render adapter icons and input fields
4. **No changes** to the provisioning, publishing, or storefront pipelines

The platform is approximately **80% ready** for multi-source creator acquisition. The adapter interface exists, the provisioning pipeline is independent, and only provider-specific data storage needs generalization.
