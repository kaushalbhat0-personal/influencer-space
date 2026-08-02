# Builder Sidebar Report — IMPLEMENTATION-21 (BUG 5/6)

## BUG 5 — Left sidebar could not be re-opened

**Cause:** `ResizablePanel` rendered the collapse toggle button INSIDE the
collapsible panel. When collapsed, the panel was `width: 0` + `overflow-hidden`,
so the button (positioned at `-right-3`) was **clipped and invisible** — the user
collapsed the sidebar and could never expand it again (a dead-end UI).

**Fix:** the toggle button now lives in a **never-collapsed strip**
(`COLLAPSED_STRIP = 20px`) that stays beside the panel at all times:

- Expanded → the button sits at the panel's outer edge (as before).
- Collapsed → the panel body is `width: 0` + hidden, but the strip remains, so
  the button is always visible and clickable at the boundary.
- `z-30` on the strip ensures it paints above the canvas (which is a positioned
  sibling) so the click target is never covered.

The button exposes `aria-label`/`aria-expanded` and `data-testid="panel-toggle-left|right"`.

## BUG 6 — Right sidebar consistency

- `rightCollapsed` now initializes from `persisted.rightPanelCollapsed`
  (previously hardcoded `false`).
- The persistence effect now saves both panels:
  `builderPersistence.save({ sidebarCollapsed, rightPanelCollapsed, responsiveMode })`
  (sessionStorage key `builder_state`).

## Keyboard shortcuts (preserved/extended)

`useKeyboardShortcuts` now registers:
- `[` → toggle left sidebar
- `]` → toggle right panel

The workspace listens for a `builder:panel-toggle` window event (side in
`detail`) and flips the matching state — the shortcut stays decoupled from the
toggle buttons.

## Verification (L4)

```
sidebar visible before collapse      ✅
sidebar hidden after collapse        ✅
toggle visible while collapsed       ✅   (re-open possible — no dead-end)
sidebar re-opened                    ✅
sidebar still collapsed after refresh ✅   (persisted)
toggle visible after refresh         ✅
```

Local + production both pass.
