# Publish Data Flow Report

**IMPLEMENTATION-17 · Phase E · 2026-08-01**

## Verdict

Publish serializes **presentation only** and never bakes content or empty asset
ids into the snapshot. The live content the snapshot references is always read
from the CMS at render time. Publish no longer fails because a module query or
asset lookup hiccuped.

## The flow

```
Builder draft (pages) + websiteAggregate.buildWithDiagnostics() + theme + nav
   → buildRuntimeSnapshot()          (full runtime snapshot, traced)
   → content := EMPTY_AGGREGATE      (presentation-only persistence)
   → publishRepository.createPublish (Draft Layout → Published Layout)
```

## Presentation-only serialization

- `content: EMPTY_AGGREGATE` — content is **never** copied into the snapshot.
- The storefront always reads content live (`mergeLiveContent` →
  `websiteAggregate.build()`), so the published artifact references live content
  rather than carrying a copy.
- Layout configs are presentation props only (Builder contract, IMPLEMENTATION-14);
  no content and no empty/invalid asset ids are written into sections.

## Asset-id hygiene in publish

- The aggregate that feeds publish is built via `buildWithDiagnostics`; invalid
  asset ids are rejected by the single safe resolver and recorded, never written
  into the snapshot.
- No `Block.config` / layout config can contain an asset id at all — content and
  asset references live in the CMS, not the PresentationBlueprint.

## Publish no longer "intermittently fails"

The previous symptom had two causes, both fixed:

1. **Aggregate hard-fail** — a single module query / asset lookup failure threw
   out of `build()` and aborted the publish transaction. `buildWithDiagnostics`
   isolates modules: a broken module degrades to empty (recorded in
   `moduleFailures`) and publish completes with the healthy modules.
2. **Opaque Invalid UUID** — raw asset ids reaching `prisma.asset.*` in write /
   processing paths threw `Invalid UUID ""`. All paths now route through
   `requireAssetId` / `normalizeAssetId` with clear, module-labelled errors.

## Evidence

- Publish trace (`runtimeType: publish`) reports the same aggregate counts,
  12 sections and the same Runtime Signature as Builder/Storefront.
- `scripts/runtime-parity-audit.ts` → draft signature == published signature
  (`75e22f9c…`), sections 12 == 12.
- Production E2E test `03` publishes successfully end-to-end (save draft →
  publish → reload → storefront live).
- Dev server log scan for `Invalid UUID|invalid input syntax for uuid` → **0**.
