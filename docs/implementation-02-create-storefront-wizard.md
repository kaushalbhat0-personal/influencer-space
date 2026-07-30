# IMPLEMENTATION-02: Universal Create Storefront Wizard

**Date:** 2026-07-30  
**Status:** Complete  
**TypeScript:** 0 errors ✅  
**Build:** passes ✅  

---

## Component Architecture

```
components/acquisition/
  create-storefront-wizard.tsx   ← Main orchestrator
  strategy-selector.tsx           ← Registry-driven strategy grid
  strategy-card.tsx               ← Individual strategy card
  strategy-input-host.tsx         ← Dynamic input per strategy
  acquisition-preview.tsx         ← Review & edit acquired profile
  provision-progress.tsx          ← Progress indicator
  success-screen.tsx              ← Post-provisioning success
  types.ts                        ← Wizard-specific types
```

## Wizard Flow

```
Step 1: Strategy Selection         Step 2: Strategy Input
┌─────────────────────────┐       ┌─────────────────────────┐
│  YouTube Channel  70%   │       │  YouTube URL or Handle  │
│  Manual Creator    30%  │  →   │  [________________]     │
│  Demo Seed        95%   │       │  [Back]    [Analyze]    │
└─────────────────────────┘       └─────────────────────────┘

Step 3: Preview & Edit            Step 4: Progress
┌─────────────────────────┐       ┌─────────────────────────┐
│  Brand Name: [____]     │       │  ✅ Acquiring data      │
│  Tagline:     [____]    │  →   │  ◻  Normalizing profile │
│  Products: [...]        │       │  ◻  Creating workspace  │
│  [Back] [Create]        │       │  ◻  Publishing...       │
└─────────────────────────┘       └─────────────────────────┘

Step 5: Success
┌─────────────────────────┐
│  ✅ Storefront Created! │
│                        │
│  storefront URL         │
│  [View Dashboard]       │
│  [Create Another]       │
└─────────────────────────┘
```

---

## Registry-Driven Architecture

The wizard dynamically renders all registered strategies from `AcquisitionRegistry.getAll()`. No strategy-specific logic exists in the wizard — every strategy displays via `StrategyCard` which reads `adapter.icon`, `adapter.label`, `adapter.description`, `adapter.typicalConfidence`, and `adapter.requiresManualReview`.

To add a new strategy (e.g., Instagram):
1. Implement `CreatorAcquisitionAdapter`
2. Register in `lib/acquisition/index.ts`
3. The wizard automatically picks it up

---

## Files Created (8)

| File | Purpose |
|------|---------|
| `components/acquisition/types.ts` | Wizard-specific types (WizardStep, StorefrontSubject) |
| `components/acquisition/create-storefront-wizard.tsx` | Main orchestrator — manages steps, state, transitions |
| `components/acquisition/strategy-selector.tsx` | Registry-driven grid of strategy cards |
| `components/acquisition/strategy-card.tsx` | Individual strategy card with icon, label, confidence, badges |
| `components/acquisition/strategy-input-host.tsx` | Dynamic input — adapts per strategy type |
| `components/acquisition/acquisition-preview.tsx` | Review & edit profile before provisioning |
| `components/acquisition/provision-progress.tsx` | Multi-stage progress indicator |
| `components/acquisition/success-screen.tsx` | Post-provisioning success with actions |

---

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | 0 errors ✅ |
| `npm run build` | Passes ✅ |
| Registry-driven UI | ✅ |
| No hardcoded strategies | ✅ |
| Existing provisioning unchanged | ✅ |
| Existing publishing unchanged | ✅ |
| Ready for Instagram | ✅ (just implement + register adapter) |
| Ready for Website URL | ✅ (just implement + register adapter) |
| Ready for AI Generator | ✅ (just implement + register adapter) |
