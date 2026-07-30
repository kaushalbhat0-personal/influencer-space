# ARCHITECTURE-02: Universal Creator Acquisition Architecture

**Date:** 2026-07-30  
**Status:** Architecture Blueprint — No Implementation  

---

## Phase 1 — Domain Rename Audit

| Old Term | New Term | Reason | Breaking? |
|----------|----------|--------|-----------|
| `ImportSource` | `AcquisitionStrategy` | "Import" implies data movement; "Acquisition" implies creator onboarding | Yes — rename type |
| `CreatorImportAdapter` | `CreatorAcquisitionAdapter` | Reflects real purpose: acquiring creator data, not importing | Yes — rename interface |
| `ImportAnalysisResult` | `AcquisitionResult` | Strategy produces a result, not just analysis | Yes — rename type |
| `importCreator()` | `acquireAndProvision()` | Function acquires + provisions; name should reflect both | Yes — rename action |
| `analyzeCreatorImport()` | `executeStrategy()` | Strategy is executed, not "analyzed" | Yes — rename action |
| `lib/import/` | `lib/acquisition/` | Domain directory rename | Yes — path change |
| `actions/import.actions.ts` | `actions/acquisition.actions.ts` | File rename | Yes |

**Deprecation strategy:** Keep old exports as re-exports from new locations for one release cycle.

---

## Phase 2 — Acquisition Strategy Model

```
Acquisition Strategy = a method of acquiring creator data

Examples:
  YouTube URL        → public scrape + YouTube API fallback
  Instagram Username → public scrape
  Website URL        → Open Graph + meta tags
  Manual Wizard      → multi-step form
  AI Generator       → LLM generates profile from niche + keywords
  TikTok Handle      → public scrape
  GitHub Profile     → GitHub API
  Portfolio URL      → HTML scrape
  Resume/CV          → PDF parsing + AI extraction
  CSV Import         → bulk upload
  Notion Page        → Notion API
  Twitch Channel     → Twitch API
```

Strategies are NOT just "providers." A strategy defines HOW data is acquired, not WHERE from.

---

## Phase 3 — CreatorAcquisitionAdapter Interface

```ts
interface CreatorAcquisitionAdapter {
  /** Unique strategy identifier */
  id: string;
  
  /** Human-readable label */
  label: string;
  
  /** Short description shown in strategy selector */
  description: string;
  
  /** Icon component for UI */
  icon?: LucideIcon;
  
  /** Whether this strategy requires manual review before provisioning */
  requiresManualReview: boolean;
  
  /** Estimated confidence level (0-100) this strategy typically achieves */
  typicalConfidence: number;
  
  /** Validate user input before execution */
  validate(input: string): { valid: boolean; error?: string };
  
  /** Execute the acquisition strategy, returning structured result */
  acquire(input: string): Promise<AcquisitionResult>;
  
  /** Optional: return configuration UI fields (for wizard-based strategies) */
  configFields?: () => FormField[];
}
```

---

## Phase 4 — AcquisitionResult

```ts
interface AcquisitionResult {
  /** Normalized business data for provisioning */
  profile: CreatorProfile;
  
  /** Media assets collected during acquisition */
  assets?: {
    avatarUrl?: string;
    bannerUrl?: string;
    logoUrl?: string;
    images?: { url: string; label: string }[];
  };
  
  /** Social links discovered */
  socials?: { platform: string; url: string }[];
  
  /** Strategy-specific metadata (not used by provisioning) */
  providerMetadata?: Record<string, unknown>;
  
  /** Acquisition quality metrics */
  confidence: number;
  completeness: number;
  warnings: string[];
  
  /** If true, provisioning should wait for human review */
  requiresManualReview: boolean;
  
  /** Raw input that produced this result */
  rawSource: { strategy: string; input: string };
  
  /** Track provenance for analytics */
  analytics?: {
    source: string;
    durationMs: number;
    dataPoints: number;
  };
}
```

**CreatorProfile becomes only normalized business data:**

```ts
interface CreatorProfile {
  // Required
  creatorName: string;
  brandName: string;
  
  // Optional business data
  tagline?: string;
  bio?: string;
  heroTitle?: string;
  aboutText?: string;
  tone?: string;
  niche?: string;
  audience?: string;
  products?: { name: string; price: number; description: string }[];
  services?: string[];
  socialLinks?: { platform: string; url: string }[];
  seoTitle?: string;
  seoDesc?: string;
  palette?: { primary: string; secondary: string };
  faq?: { q: string; a: string }[];
  testimonials?: { name: string; text: string }[];
  pages?: string[];
  
  // Removed: channelId, source, isDemo, seedId
  // These move to AcquisitionResult.providerMetadata
}
```

---

## Phase 5 — Canonical CreatorProfile Field Audit

| Field | Status | Destination |
|-------|--------|-------------|
| `source` | Remove | Move to `AcquisitionResult.rawSource.strategy` |
| `creatorName` | Keep | Required |
| `brandName` | Keep | Required |
| `tagline` | Keep | Optional |
| `bio` | Keep | Optional |
| `heroTitle` | Keep | Optional (derived) |
| `aboutText` | Keep | Optional |
| `tone` | Keep | Optional (derived) |
| `niche` | Keep | Optional (derived) |
| `audience` | Keep | Optional (derived) |
| `products` | Keep | Optional |
| `services` | Keep | Optional |
| `socialLinks` | Keep | Optional |
| `seoTitle` | Keep | Optional (derived) |
| `seoDesc` | Keep | Optional (derived) |
| `palette` | Keep | Optional (derived) |
| `logoUrl` | Remove | Move to `AcquisitionResult.assets.logoUrl` |
| `faq` | Keep | Optional |
| `testimonials` | Keep | Optional |
| `pages` | Keep | Optional (defaults) |
| **`channelId`** | **Remove** | **Move to `AcquisitionResult.providerMetadata`** |
| `isDemo` | Remove | Strategy-level concern |
| `seedId` | Remove | Strategy-level concern |

---

## Phase 6 — Provider Storage Evolution

### Current Schema

```prisma
model ProviderAccount {
    youtubeChannelId  String?  // Provider-specific column
    twitchChannelId   String?  // Provider-specific column
    // Future providers need new columns each time
}
```

### Target Schema

```prisma
model ProviderAccount {
    id              String   @id @default(uuid())
    provider        String   // "youtube" | "instagram" | "twitch" | "github" | ...
    providerUserId  String   // User/channel ID on the provider
    workspaceId     String?  // Link to workspace
    tenantId        String?  // Link to tenant
    accessToken     String?  // Encrypted
    refreshToken    String?  // Encrypted
    tokenExpiresAt  DateTime?
    metadata        Json     // Provider-specific data (subscribers, followers, etc.)
    status          String   @default("connected")
    lastSyncAt      DateTime?
    connectedAt     DateTime @default(now())
    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt
    
    workspace       Workspace?  @relation(fields: [workspaceId], references: [id])
    tenant          Tenant?     @relation(fields: [tenantId], references: [id])
    
    @@unique([provider, providerUserId])
    @@index([workspaceId])
    @@index([tenantId])
}
```

### YouTubeQuotaUsage → ProviderQuotaUsage

**Trade-off:** 
- Generalizing adds a `provider` discriminator column but makes the table work for all providers
- Keeping YouTube-specific adds complexity for each new provider

**Recommendation:** Generalize to `ProviderQuotaUsage` with `provider` discriminator. Low effort, high future value.

### SocialStats Evolution

Current: Per-provider columns (`youtubeSubscribers`, `instagramFollowers`, etc.)
Target: One row per platform with `platform` discriminator + JSON metrics.

---

## Phase 7 — Workspace Independence

```
                  ┌─────────────────┐
                  │  Workspace Owner │
                  │  (any role)      │
                  └────────┬────────┘
                           │ wants to create
                           ▼
                  ┌─────────────────┐
                  │   Storefront     │
                  └────────┬────────┘
                           │ choose
                           ▼
                  ┌──────────────────────┐
                  │ Acquisition Strategy  │
                  │ (YouTube / Manual /   │
                  │  AI / Instagram / ...)│
                  └──────────┬───────────┘
                             │ produces
                             ▼
                  ┌──────────────────────┐
                  │   AcquisitionResult   │
                  └──────────┬───────────┘
                             │ normalized to
                             ▼
                  ┌──────────────────────┐
                  │    CreatorProfile     │
                  └──────────┬───────────┘
                             │ consumed by
                             ▼
                  ┌──────────────────────┐
                  │   ProvisioningEngine  │
                  │  (same for ALL roles) │
                  └──────────────────────┘
```

**The provisioning pipeline is identical for Creator, Agency, and Freelancer.** Only permissions differ:
- Creator can provision for themselves
- Agency can provision for clients
- Super Admin can provision for anyone
- Freelancer can provision for clients (same as Agency with different UI)

**Audit of role-specific conditions in provisioning:**

| Location | Role Check | Should Change? |
|----------|-----------|----------------|
| `provision.actions.ts:34` | `session.user.role !== "SUPER_ADMIN"` | Keep — admin guard |
| `provision.actions.ts:62` | `session.user.role !== "SUPER_ADMIN"` | Keep — admin guard |
| `require-tenant.ts:34` | Checks `AGENCY_ADMIN` / `AGENCY_STAFF` | Keep — role routing |
| `lifecycle/token-resolver.ts` | SUPER_ADMIN / AGENCY redirects | Keep — dashboard routing |

**No provisioning logic changes needed.** All role-specific code is in auth/UI, not in the provisioning engine.

---

## Phase 8 — UI Architecture

```
Create Storefront Wizard (universal)
  │
  ├── Step 1: Who is this for?
  │     ├── Myself (Creator)
  │     ├── A client (Agency/Freelancer)
  │     └── A platform user (Super Admin)
  │
  ├── Step 2: Choose Acquisition Strategy
  │     ├── YouTube URL        ──┐
  │     ├── Instagram Username  ─┤ Dynamically registered
  │     ├── Manual Wizard       ─┤ from adapter registry
  │     ├── AI Generator        ─┤
  │     ├── Website URL         ─┘
  │     └── More...
  │
  ├── Step 3: Acquire Data
  │     ├── [Strategy-specific input form]
  │     └── [Progress / preview]
  │
  ├── Step 4: Review & Edit
  │     ├── CreatorProfile preview
  │     └── Editable fields
  │
  ├── Step 5: Theme & Branding
  │     ├── Template selection
  │     └── Color palette
  │
  ├── Step 6: Provision
  │     └── Progress indicator
  │
  └── Step 7: Published!
        └── Storefront URL + Dashboard link
```

The wizard is a single component that dynamically renders strategy-specific steps. No hardcoded strategy cards.

---

## Phase 9 — Roadmap Prioritization

| Priority | Strategy | Why This Order |
|----------|----------|----------------|
| **P1** | **Manual Wizard** | Zero API dependencies. Works for every use case. Unblocks all testing. |
| **P2** | **YouTube URL** | Already exists. Port to new architecture. Highest traffic source. |
| **P3** | **Instagram URL (public)** | Public scrape — no API approval needed. High demand. |
| **P4** | **Website URL** | OG tags + meta scrape. No API needed. Covers portfolio sites. |
| **P5** | **AI Business Generator** | LLM generates profile from keywords. No API dependencies. Premium feature. |
| **P6** | **TikTok / Twitch / LinkedIn** | Public scrape first. Official APIs later if needed. |
| **P7** | **Official Social APIs** | Last priority. Require approvals, rate limits, maintenance burden. |

**Why official APIs are last:**
- Change frequently (breaking changes)
- Require OAuth approval flows
- Have rate limits that block onboarding at scale
- Often don't expose public-facing data that's already visible on profiles
- Public scraping covers 90% of use cases with zero API dependency

---

## Phase 10 — Architecture Validation

**Statement: "Everything after CreatorProfile should be completely unaware of where the data came from."**

| Component | Knows About Source? | Status |
|-----------|--------------------|--------|
| `provisioning-service.ts` | No — accepts `ProvisioningInput` | ✅ Clean |
| `publishing/service.ts` | No — accepts `tenantId` | ✅ Clean |
| `lifecycle/service.ts` | No — reads from DB | ✅ Clean |
| `builder/` | No — website-specific | ✅ Clean |
| `storefront/` | No — tenant/website-specific | ✅ Clean |
| `billing/` | No — workspace-specific | ✅ Clean |
| `workspace/` | No — workspace-specific | ✅ Clean |
| `auth/` | No — user-specific | ✅ Clean |
| `template/` | No — template-specific | ✅ Clean |
| `theme/` | No — theme-specific | ✅ Clean |

**Verdict: The statement is already true.** No component downstream of `CreatorProfile` knows about YouTube or any other source. The acquisition layer is fully isolated.

---

## Phase 11 — Migration Blueprint

### Current Architecture

```
lib/import/adapters/{youtube,manual,demo-seed}.ts
                  ↓
         CreatorProfile (with source-specific fields)
                  ↓
         importCreator() → provisioning + publishing
```

### Target Architecture

```
lib/acquisition/strategies/{youtube,manual,instagram,website,ai,...}.ts
                  ↓
            AcquisitionResult (rich metadata + normalized profile)
                  ↓
            CreatorProfile (business data only)
                  ↓
         acquireAndProvision() → provisioning + publishing
```

### Migration Phases

| Phase | Changes | Risk |
|-------|---------|------|
| **1 — Rename** | `lib/import/` → `lib/acquisition/`, types rename, action rename | Low — mostly mechanical |
| **2 — AcquisitionResult** | Add `AcquisitionResult` type, wrap adapters, extract `channelId` | Low — additive |
| **3 — Schema** | Generalize `ProviderAccount`, `SocialStats`, `YouTubeQuotaUsage` | Medium — data migration |
| **4 — UI Wizard** | Build universal storefront creation wizard | Medium — new component |
| **5 — New Strategies** | Manual, Instagram URL, Website URL, AI Generator | Medium — per-strategy |
| **6 — Deprecation** | Remove old imports, clean up YouTube-specific columns | Low — after migration |

### Breaking Changes

| Change | Mitigation |
|--------|-----------|
| `ImportSource` → `AcquisitionStrategy` | Type alias + deprecation warning |
| `CreatorImportAdapter` → `CreatorAcquisitionAdapter` | Keep old export as re-export |
| `importCreator()` → `acquireAndProvision()` | Old function delegates to new |
| `channelId` removal from `CreatorProfile` | Moved to `AcquisitionResult.providerMetadata` |

---

## Phase 12 — Final Deliverables

### Architecture Diagrams

```
CURRENT:

Super Admin → ProvisionModal → ImportSource → Adapter → CreatorProfile → provisioningService → publish
                  Agency → OnboardingPage → ImportSource → Adapter → CreatorProfile → provisioningService → publish
                Creator → OnboardingPage → ImportSource → Adapter → CreatorProfile → provisioningService → publish
           (3 different entry points, same pipeline, mixed terminology)


TARGET:

   Any User → CreateStorefrontWizard → AcquisitionStrategy → CreatorAcquisitionAdapter
                                                                        ↓
                                                               AcquisitionResult
                                                                        ↓
                                                               CreatorProfile
                                                                        ↓
                                                               ProvisioningEngine
                                                                        ↓
                                                                  Publishing
                                                                        ↓
                                                               Storefront + Dashboard
```

### Data Flow

```
Raw Input (URL, handle, form data, keywords)
  │
  ▼
CreatorAcquisitionAdapter.acquire(input)
  │
  ▼
AcquisitionResult {
    profile: CreatorProfile,    // → provisioning
    assets: { avatar, banner }, // → media service
    socials: [...],             // → storefront social links
    providerMetadata: {...},    // → ProviderAccount table
    confidence, completeness, warnings, requiresManualReview
}
  │
  ▼
ProvisioningEngine.provision(result.profile)
  │
  ▼
Publish + Storefront
```

### Implementation Roadmap

| Milestone | Time | Deliverable |
|-----------|------|-------------|
| M1 — Rename | 2 days | Types, actions, directory renamed. Backward compat. |
| M2 — AcquisitionResult | 1 day | New type. Adapters wrapped. |
| M3 — Manual Wizard | 3 days | Full-featured manual storefront creation |
| M4 — Schema Migration | 2 days | ProviderAccount + SocialStats generalization |
| M5 — Universal Wizard UI | 5 days | CreateStorefront component with strategy selector |
| M6 — Instagram URL | 2 days | Public scrape strategy |
| M7 — Website URL | 2 days | OG/meta scrape strategy |
| M8 — AI Generator | 5 days | LLM-based profile generation |
| M9 — Deprecation Cleanup | 1 day | Remove old types/exports |

**Total:** ~23 days to full universal acquisition platform.

### Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|-----------|
| Public scraping breaks | High | Medium | Graceful fallback to manual |
| API rate limits during provisioning | Medium | Low | No official APIs in P1-P5 |
| Schema migration data loss | High | Low | Backup + test migration first |
| Backward compat breaks | High | Low | Deprecation layer, re-exports |
| Rename causes import errors | Medium | Medium | Codemod + CI checks |

### Architecture Principles (validated)

✅ SOLID — Single responsibility per adapter  
✅ DRY — One provisioning engine for all  
✅ KISS — AcquisitionResult is the only contract  
✅ ADIP — Module boundaries preserved  
✅ Clean Architecture — Outer layer (acquisition) → inner layer (provisioning)  
✅ Open/Closed — New strategies via new adapter, no pipeline changes  
✅ Backward Compat — Old YouTube flow continues working  
✅ Extensible — 5+ year horizon without architectural changes  
