# Accessibility Audit — RCCF-LAUNCH-TRACK-01

Target: WCAG AA where practical. No redesign — fixes only.

## Verified good (no change)

- `lang="en"` on `<html>` ✅
- Global `:focus-visible` ring (`--focus-ring`) ✅
- `prefers-reduced-motion` global override ✅
- Skip links on the marketing nav + storefront ✅
- ARIA-correct tabs in Pricing, Billing, Products/Gallery toolbars ✅
- `LoadingSpinner` has `role="status"` + sr-only text ✅
- `Progress` has `role="progressbar"` ✅

## Applied this sprint

| # | Fix | File |
| --- | --- | --- |
| A-1 | `aria-label="Close dialog"` on the unlabeled icon-only close button | `super-admin/_components/provision-modal.tsx` |
| A-2 | `aria-label="Close dialog"` on the `&times;` close button | `admin/themes/theme-marketplace-client.tsx` |
| A-3 | `aria-label="Close dialog"` on the `&times;` close button | `admin/media/media-library.tsx` |
| A-4 | `aria-label="Close dialog"` on the `&times;` close button | `admin/blueprints/blueprint-gallery-client.tsx` |

## Gaps (roadmap)

| # | Issue | Fix |
| --- | --- | --- |
| G-1 | Tab-like UIs without `role="tablist"/"tab"` + `aria-selected` (SEOPageClient, provision-modal, pricing-center tabs, PageHeader tabs) | Add roles + `aria-selected` + keyboard arrow support |
| G-2 | Title-only icon buttons (builder panels) | Add `aria-label`/`aria-pressed` |
| G-3 | 32 raw `<img>` tags (mostly `alt`-correct, decorative `alt=""` where appropriate) | Migrate LCP/hero to `next/image`; keep decorative `alt=""` |
| G-4 | Bare red-text empty states (games/milestones/messages) | Use `EmptyState` with a clear message + CTA (AA 1.4.3 contrast + guidance) |
| G-5 | Focus trap in bespoke modals | Standardize on a `Dialog` primitive with focus trap + `Esc` |
| G-6 | Form error announcement | `aria-live` on inline form errors |

## Contrast note
The dark zinc palette (`text-zinc-400/500` on near-black) is used pervasively;
`text-zinc-500` on `#0A0A0B` is ~4.6:1 (AA for normal text at the larger sizes
used). Secondary `text-zinc-600` on cards should be reserved for non-essential
text. Flag as a QA sweep item before launch.
