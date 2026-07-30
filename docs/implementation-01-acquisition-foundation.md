# IMPLEMENTATION-01: Creator Acquisition Foundation

**Date:** 2026-07-30  
**Status:** Complete  
**TypeScript:** 0 errors ✅  
**Build:** passes ✅  

---

## Architecture Evolution

### Before

```
lib/import/
  types.ts          ImportSource, CreatorImportAdapter, ImportAnalysisResult, CreatorProfile
  adapters/
    index.ts         Hardcoded switch via Map<ImportSource, Adapter>
    youtube.ts       YouTubeAdapter
    manual.ts        ManualAdapter
    demo-seed.ts     DemoSeedAdapter

actions/
  import.actions.ts  analyzeCreatorImport(), importCreator()
```

### After

```
lib/acquisition/
  types.ts           AcquisitionStrategy, CreatorAcquisitionAdapter, AcquisitionResult, CreatorProfile (cleaned)
  registry.ts        AcquisitionRegistry (register, get, getAll, exists)
  strategies/
    youtube.ts       YouTubeAcquisitionAdapter (returns AcquisitionResult)
    manual.ts        ManualAcquisitionAdapter
    demo-seed.ts     DemoSeedAcquisitionAdapter
  index.ts           Barrel + auto-registration

actions/
  acquisition/
    acquire.actions.ts  executeStrategy(), acquireAndProvision()

lib/import/          [Backward compatibility — delegates to lib/acquisition/]
  types.ts → re-exports from lib/acquisition
  adapters/index.ts → delegates to acquisitionRegistry

actions/
  import.actions.ts  [Backward compatibility — delegates to acquisition actions]
```

---

## Migration Map

| Old | New | Status |
|-----|-----|--------|
| `ImportSource` | `AcquisitionStrategy` | Deprecated alias |
| `CreatorImportAdapter` | `CreatorAcquisitionAdapter` | Deprecated alias |
| `ImportAnalysisResult` | `AcquisitionResult` | Deprecated alias |
| `ImportRecord` | `AcquisitionRecord` | Deprecated alias |
| `ImportResult` | `AcquisitionProvisionResult` | Deprecated alias |
| `CreatorProfile.source` | Removed (moved to `AcquisitionResult.strategy`) | ✅ |
| `CreatorProfile.channelId` | Removed (moved to `AcquisitionResult.providerMetadata`) | ✅ |
| `CreatorProfile.isDemo` | Removed (strategy-level) | ✅ |
| `CreatorProfile.seedId` | Removed (moved to `AcquisitionResult.providerMetadata`) | ✅ |
| `adapter.analyze()` | `adapter.acquire()` | ✅ |
| `adapter.source` | `adapter.id` | ✅ |

---

## CreatorProfile Cleanup

**Removed from CreatorProfile (4 fields):**

| Field | New Location |
|-------|-------------|
| `source` | `AcquisitionResult.strategy` |
| `channelId` | `AcquisitionResult.providerMetadata.channelId` |
| `isDemo` | Strategy-level concern |
| `seedId` | `AcquisitionResult.providerMetadata.seedId` |

**New CreatorProfile** — only normalized business data:

```ts
interface CreatorProfile {
  creatorName: string;      // Required
  brandName: string;        // Required
  tagline: string;          // Optional business data
  bio: string;
  heroTitle: string;
  aboutText: string;
  tone: string;
  niche: string;
  audience: string;
  products: { name: string; price: number; description: string }[];
  services: string[];
  socialLinks: { platform: string; url: string }[];
  seoTitle: string;
  seoDesc: string;
  palette: { primary: string; secondary: string };
  logoUrl?: string;
  faq: { q: string; a: string }[];
  testimonials: { name: string; text: string }[];
  pages: string[];
}
```

---

## AcquisitionResult

```ts
interface AcquisitionResult {
  profile: CreatorProfile;           // → provisioning engine
  strategy: AcquisitionStrategy;     // Which strategy produced this
  rawInput: string;                  // Original input
  confidence: number;                // 0-100
  completeness: number;              // 0-100
  warnings: string[];
  requiresManualReview: boolean;     // True = hold for human review
  assets?: { avatarUrl?: string; bannerUrl?: string; logoUrl?: string; };
  providerMetadata?: Record<string, unknown>;  // Strategy-specific data
}
```

---

## AcquisitionRegistry

```ts
class AcquisitionRegistry {
  register(adapter: CreatorAcquisitionAdapter): void;   // Throws on duplicate
  get(id: AcquisitionStrategy): CreatorAcquisitionAdapter | undefined;
  getAll(): CreatorAcquisitionAdapter[];
  exists(id: AcquisitionStrategy): boolean;
}
```

Strategies auto-register on module import (in `lib/acquisition/index.ts`). New strategies only need to import and register — no switch statements, no pipeline changes.

---

## Adapter Contract

```ts
interface CreatorAcquisitionAdapter {
  id: AcquisitionStrategy;
  label: string;
  description: string;
  icon?: LucideIcon;
  requiresManualReview: boolean;
  typicalConfidence: number;
  validate(input: string): { valid: boolean; error?: string };
  acquire(input: string): Promise<AcquisitionResult>;
}
```

---

## Future Extension Guide

To add a new acquisition strategy (e.g., Instagram):

1. Create `src/lib/acquisition/strategies/instagram.ts`
2. Implement `CreatorAcquisitionAdapter` interface
3. Import and register in `src/lib/acquisition/index.ts`

That's it. No provisioning changes. No publishing changes. No UI changes required (the provision-modal dynamically renders all registered strategies).

---

## Files Created (8)

| File | Purpose |
|------|---------|
| `src/lib/acquisition/types.ts` | New types: CreatorAcquisitionAdapter, AcquisitionResult, CreatorProfile (cleaned) |
| `src/lib/acquisition/registry.ts` | AcquisitionRegistry class |
| `src/lib/acquisition/strategies/youtube.ts` | Migrated YouTube strategy |
| `src/lib/acquisition/strategies/manual.ts` | Migrated Manual strategy |
| `src/lib/acquisition/strategies/demo-seed.ts` | Migrated Demo Seed strategy |
| `src/lib/acquisition/index.ts` | Barrel + auto-registration |
| `src/actions/acquisition/acquire.actions.ts` | New server actions: executeStrategy(), acquireAndProvision() |
| `docs/implementation-01-acquisition-foundation.md` | This document |

## Files Modified (4)

| File | Change |
|------|--------|
| `src/lib/import/index.ts` | New — re-exports from lib/acquisition for backward compat |
| `src/lib/import/adapters/index.ts` | Rewritten — delegates to acquisitionRegistry |
| `src/actions/import.actions.ts` | Rewritten — delegates to acquisition actions |
| `src/app/super-admin/_components/provision-modal.tsx` | Updated to use new types + registry |
| `src/components/import/ImportPreview.tsx` | Updated to use new types |
| `src/components/import/ImportHistoryTable.tsx` | Updated to use new types |

---

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | 0 errors ✅ |
| `npm run build` | Passes ✅ |
| Existing YouTube provisioning | Unchanged (backward compat) |
| Existing Manual provisioning | Unchanged (backward compat) |
| Existing Demo provisioning | Unchanged (backward compat) |
| Registry-based architecture | Established ✅ |
| CreatorProfile cleaned (4 fields removed) | ✅ |
| AcquisitionResult introduced | ✅ |
| Backward compatibility layer | ✅ |
