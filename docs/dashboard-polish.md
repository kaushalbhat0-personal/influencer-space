# Dashboard Polish — RCCF-LAUNCH-TRACK-01

## Creator dashboard (`/admin/dashboard`)

### Guided empty state — verified present ✅
When a creator has no products/bookings/orders, the dashboard renders a guided
card ("Let's set up your store" — previously the misleading **"Your website is
live!"**, now fixed) with the best next step link + the `SuccessMilestonesCard`
next-task. This satisfies "never show 0 Products / 0 Revenue" — empty states
guide instead of report.

### Hierarchy
- Best Next Step card (top) → guided action
- Store Health hero ("Store Health" — renamed from "Business Health")
- Profile Knowledge card (renamed from "Knowledge Score")
- Business metrics grid (only when commerce exists)
- Onboarding checklist when incomplete

### Copy applied
- "Business Health" → **"Store Health"** (hero + legacy card + builder badge)
- "Knowledge Score" → **"Profile Knowledge"**
- "Priority score N" → **"Impact N"**; "Health +N" chip → **"Website score +N"**
- "Your website is live!" → **"Let's set up your store"** (pre-publish honesty)

## Agency dashboard

- Empty clients table uses `EmptyState` with a CTA (verified).
- Import flow copy de-jargoned: "Flow" → **"How it works"** with plain-language
  steps ("We analyze the creator's public profile…").

## Super Admin

- Consistent dark surface; stat cards + distribution bars verified.
- Pricing Center analytics (MRR/ARR, distribution, trial funnel, churn) render
  cleanly.

## Empty-state inventory (weakest, roadmap)

| Surface | Current | Recommended |
| --- | --- | --- |
| `admin/games`, `admin/milestones`, `admin/messages` | bare red text block | `EmptyState` with CTA |
| `agency/domains`, `agency/billing` | raw text | `EmptyState` with CTA |
| table `emptyMessage` (crud-table/DataTable) | "No data found." | contextual message + CTA |
| builder `section-manager` | "No sections yet. Add one below." | illustrated empty state |

## Perceived performance

- Dashboard has a pulse-skeleton `loading.tsx` ✅ (the only route with one).
- Roadmap: skeletons for the other admin routes (currently a shared spinner in
  the layout), streaming + optimistic updates for quick-start actions.
