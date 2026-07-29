# Creator Journey

> **Part of:** [Creatos Platform Architecture v1](platform-architecture-v1.md)

---

## Lifecycle Overview

```
Landing → Signup → Choose Template → Choose Theme → Live Preview → Generate → Website Ready → Dashboard → Admin Pages → (Optional) Builder → Publish → Storefront
```

---

## Stage 1: Landing

Public marketing site. Not part of the platform architecture.

---

## Stage 2: Signup

**Entry:** `/signup`

1. User selects persona (Creator or Agency)
2. User selects plan (Free or paid)
3. User enters name, email, password
4. Account created → User is auto-signed-in

**Architecture:**
- `SignupForm.tsx` → `POST /api/auth/register`
- Creates `User` + `BillingAccount` + initial subscription
- Redirects to `/onboarding` (creator) or `/agency/dashboard` (agency)

---

## Stage 3: Choose Industry & Template

**Entry:** `/admin/create`

1. Creator selects their industry (8 options: Creator, Photographer, Business, Gamer, Agency, Podcaster, Creative Professional, Coach)
2. Creator selects a visual style
3. Review step shows:
   - Recommended Website Templates (from `RecommendationEngine`)
   - Template details (pages, sections)
   - Theme selection with color swatches
   - **Live preview** with desktop/tablet/mobile toggle + light/dark mode

**Architecture:**
- `CreationWizardClient.tsx` → industry/style/review steps
- `RecommendationEngine.recommend()` scores blueprints by industry
- Live preview uses theme tokens to render a sample page

---

## Stage 4: Generate Website

**Entry:** Review step → "Generate Website" button

1. Selected blueprint ID and theme ID are sent to server action
2. `createWebsite()` action:
   - Gets `BlueprintDefinition` from registry
   - Converts blueprint pages to `BuilderPage[]` via `blueprintToBuilderPages()`
   - Saves via `BuilderService.save()`
   - Updates `themePackageId` on website
   - Calls `PublishingService.publish()` to create initial snapshot
3. Redirects to `/admin/website-ready`

**Architecture:**
- `createWebsite()` server action (`src/actions/create.actions.ts`)
- `BlueprintRegistry.resolveInheritedBlueprint()` for template inheritance
- `BuilderService` for page persistence
- `PublishingService` for snapshot creation

---

## Stage 5: Website Ready

**Entry:** `/admin/website-ready`

1. Shows confirmation with checkmark animation
2. Displays template name and theme name
3. Shows Website Health score (from `WebsiteHealthEngine`)
4. Provides 3 primary actions:
   - View Website (opens storefront)
   - Open Builder (for layout adjustments)
   - Publish / Visit Live Site
5. Shows improvement suggestions (incomplete health checks with links)

**Architecture:**
- `WebsiteReadyClient.tsx` — client component
- `WebsiteHealthEngine.evaluate()` for health scoring
- Deep links to builder, storefront, and health item pages

---

## Stage 6: Dashboard

**Entry:** `/admin/dashboard`

The Creator Control Center shows:
- **Header:** Welcome message + Website Status link + Open Builder
- **Onboarding Checklist** (if incomplete): 5 quick-start steps
- **Quick Cards:** 11 shortcut links to admin areas
- **Metric Cards:** Products, Orders, Gallery, Avg Order
- **Recent Activity:** Audit log entries
- **Website Health:** 8 checks with scores and links
- **Storefront Status:** Publish state, version, publish/visit actions

**Architecture:**
- `DashboardPage.tsx` — client component
- `getDashboardData()` server action aggregates metrics, health, activity
- `WebsiteHealthEngine` for canonical health scoring

---

## Stage 7: Admin Pages

Content management pages accessible from Dashboard or sidebar:
- Products, Gallery, Testimonials, FAQ, Timeline/Milestones, Games, Links
- Profile, SEO, Hero/Settings, Content Feed
- Appearance/Theme, Navigation
- Media Library, Messages, Analytics
- Billing, Integrations, Domain

Each page writes to its designated business table(s). Data flows into the next publish via `WebsiteAggregateService`.

---

## Stage 8: Builder (Optional)

**Entry:** `/admin/create` "Open Builder" or dashboard/sidebar "Layout Builder"

The Builder is purely for layout composition:
- Reorder sections
- Hide/show sections
- Duplicate sections
- Preview and apply themes
- Navigate to admin content pages

No content editing happens in the Builder. All content is managed in admin pages.

---

## Stage 9: Publish

**Entry:** Dashboard "Publish" button or Builder save

Publishing freezes the current state into an immutable `PublishedSnapshot`. The storefront immediately reflects the new version.

---

## Stage 10: Storefront

**Entry:** Public website URL

The storefront reads the live `PublishedSnapshot` and renders it. Zero database reads at render time (except tenant domain resolution). ISR cache revalidates every 60 seconds.

---

## Alternative Entry Points

| Path | User | Purpose |
|------|------|---------|
| `/onboarding` | New creator | AI-powered social URL import |
| `/admin/create` | Returning creator | Manual template selection |
| `/builder` | All creators | Layout adjustments |

All paths converge on the same publishing pipeline.
