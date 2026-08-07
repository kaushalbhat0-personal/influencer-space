# Builder Polish — RCCF-LAUNCH-TRACK-01

## Loading
- **FIXED**: the dynamic workspace load had **no fallback** — a blank screen
  while the chunk loaded. `loader.tsx` now shows a branded spinner + "Loading
  your editor…".
- Perceived-save feedback already present ("Draft saved" / "Unsaved changes").

## Copy
- "Loading composer…" → **"Loading your editor…"**
- Right-panel labels creator-first: "Recommended for this section" →
  **"Suggested for this section"**, "No recommendations — your site is in great
  shape" → **"No suggestions — your site looks great"**, "Goal Recommendations"
  → **"Suggested goals"**, "Health" chip → **"Website"**.

## Discoverability (verified, no change needed)
- Save / autosave indicators, undo/redo, publish CTA, section ordering, and
  visibility toggles are present in the toolbar/panels.
- Builder right panel (health, recommendations, experience, evolution) guides
  without documentation.

## Performance feel (already strong from LAUNCH-01)
- Save is batched (3 statements) — fast, debounced autosave with re-arm.
- Preview refetch is debounced on focus; canvas re-renders only on store change.
- `traceRuntime`/layout logs gated to non-production.

## Roadmap
- Illustrated empty state for the section manager.
- Keyboard-only section reorder (accessibility).
- Mobile builder touch-target audit (see `docs/mobile-polish.md`).
