# PRD-002: Website Builder

**Status:** Core infrastructure complete, publishing being hardened (Phase 6-8)
**Version:** 1.0

## Problem Statement

Creators generate websites via AI, but need to customize them visually. They need a drag-and-drop builder that requires no code, no JSON editing, and no developer knowledge.

## User Personas

- **Creator:** Edits their generated website — reorders sections, changes colors, adds content
- **Agency Admin:** Customizes client websites before sending for approval

## User Stories

- As a Creator, I want to add, remove, and reorder sections on my website
- As a Creator, I want to edit section properties (typography, colors, spacing, images) from an inspector panel
- As a Creator, I want to preview my changes on mobile, tablet, and desktop
- As a Creator, I want to undo/redo my changes
- As a Creator, I want to publish my changes and see them live
- As a Creator, I want to rollback to a previous published version

## Functional Requirements

1. Three-panel layout: Section list (left), Live canvas (center), Property inspector (right)
2. Section types: Hero, About, Products, Gallery, Timeline, Testimonials, FAQ, Newsletter, Contact, Footer
3. Add, remove, duplicate, reorder sections via drag-and-drop or buttons
4. Canvas with selection state, hover overlays, responsive device preview
5. Inspector with typography, spacing, colors, images, alignment, visibility controls
6. Undo/redo with snapshot-based history (max 50)
7. Publish workflow: Draft → Preview → Published → Rollback
8. Autosave draft state

## Non-Functional Requirements

- Canvas must render at 60fps
- Undo/redo must feel instant (< 100ms)
- Keyboard shortcuts for power users (Ctrl+Z, Ctrl+Y, Ctrl+D, Delete, arrows)
- WCAG AA accessible (focus management, ARIA labels, keyboard navigation)

## Acceptance Criteria

- [ ] Can add a Hero section to a page and see it render on canvas
- [ ] Can select a section, edit its name in the inspector, and see it update on canvas
- [ ] Ctrl+Z undoes the last action, Ctrl+Y redoes
- [ ] Publish button shows validation issues before allowing deployment
- [ ] Published website URL is accessible

## Success Metrics

- Builder load time < 2 seconds
- Canvas interaction latency < 50ms
- Publish success rate > 99%

## Risks

- Builder state is in-memory only — refreshing loses unsaved work
- No multi-page support yet (single-page only)
- No real-time collaboration

## Out of Scope

- Multi-page websites
- Real-time collaboration
- Custom code injection
- Theme marketplace integration (Phase 4+)
