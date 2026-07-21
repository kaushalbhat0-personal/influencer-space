# CreatorStore Design System v1.0

> **Status:** Single Source of Truth | All tokens final | Components specified
> **Aligns with:** CreatorStore v1 Product Blueprint
> **Principle:** Dark-first. AI-first. Creator-first. Premium minimalism.

---

## 1. Brand Philosophy

### Design Principles

1. **Clarity over cleverness.** Every element must communicate immediately. No decorative ambiguity.
2. **Dark is foundational.** The entire product ships dark-mode. Light mode is a future theme, not a toggle.
3. **AI is ambient.** AI features feel like native interface, not bolt-on widgets. Generation flows are cinematic but never gimmicky.
4. **Creator-first hierarchy.** The creator's content is the hero. The platform chrome is the frame.
5. **Premium minimalism.** Plenty of breathing room. Generous whitespace. Intentional density.
6. **Motion with meaning.** Every animation has a purpose: direction, confirmation, feedback, or delight.

### Visual Identity

CreatorStore sits at the intersection of **Vercel's precision**, **Stripe's confidence**, and **Framer's expressiveness**. It feels like a tool built by people who deeply understand both creators and developers.

The aesthetic is **cyber-professional**: neon accents against dark glass, sharp typography, and glows that signal "active" rather than "decorative."

### Voice

- **Confident, not arrogant.** "Your website is ready" — not "We built you a website."
- **Concise, not cryptic.** Every line of UI copy earns its place.
- **Creator-native.** Uses terms creators understand: storefront, gallery, milestones, links.

---

## 2. Color System

### Palette Architecture

```
Surface     → Backgrounds, cards, drawers           (zinc/gray scale)
Brand       → Primary identity, CTAs, accent areas   (purple-cyan-pink)
Semantic    → Status, feedback, warnings              (green, amber, red)
Neon        → Highlights, active states, AI accents   (cyan, pink, gold glows)
```

### Surface Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--surface-root` | `#09090b` | Page background |
| `--surface-base` | `#18181b` | Card backgrounds, sidebar |
| `--surface-raised` | `#27272a` | Hovered cards, dropdowns |
| `--surface-overlay` | `#3f3f46` | Modals, drawers, dialogs |
| `--surface-glass` | `rgba(9,9,11,0.92)` | Glassmorphic panels, topbar |

### Brand Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--brand-primary` | `#6366F1` (Indigo-500) | Primary buttons, links, active states |
| `--brand-secondary` | `#8B5CF6` (Violet-500) | Secondary CTAs, accents |
| `--brand-accent` | `#00F5FF` (s8ul-cyan) | Highlights, AI badges, glow effects |

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-success` | `#22C55E` | Confirmation, active status |
| `--color-warning` | `#F59E0B` | Warnings, pending states |
| `--color-danger` | `#EF4444` | Error, delete, critical |
| `--color-info` | `#3B82F6` | Informational badges, hints |

### Neon Accent Palette

| Token | Hex | Glow CSS |
|-------|-----|----------|
| `--neon-cyan` | `#00F5FF` | `0 0 10px rgba(0,245,255,0.4), 0 0 40px rgba(0,245,255,0.1)` |
| `--neon-pink` | `#FF00E5` | `0 0 10px rgba(255,0,229,0.4), 0 0 40px rgba(255,0,229,0.1)` |
| `--neon-gold` | `#FFD700` | `0 0 10px rgba(255,215,0,0.4), 0 0 40px rgba(255,215,0,0.1)` |
| `--neon-purple` | `#A855F7` | `0 0 10px rgba(168,85,247,0.4), 0 0 40px rgba(168,85,247,0.1)` |

### Glassmorphism Tokens

```css
--glass-bg: rgba(9, 9, 11, 0.85);
--glass-border: rgba(255, 255, 255, 0.06);
--glass-blur: 16px;
--glass-saturate: 1.8;
```

### CSS Variable Strategy

All colors are CSS custom properties. Themes are injected at `:root` or container scope. No hardcoded hex values in components.

```
:root {
  --surface-root: #09090b;
  --surface-base: #18181b;
  /* ... */
}
```

### Light Mode Strategy (Future)

Light mode will be a CSS variable swap via `.light` class on `<html>`. No component changes required. Not implemented in v1.

---

## 3. Typography

### Font Stack

```css
--font-sans: 'Inter', ui-sans-serif, system-ui;
--font-display: 'Orbitron', 'Inter', ui-sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Type Scale

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `--text-xs` | 0.75rem (12px) | 1rem | 400 | Captions, badges, timestamps |
| `--text-sm` | 0.875rem (14px) | 1.25rem | 400 | Body secondary, labels, descriptions |
| `--text-base` | 1rem (16px) | 1.5rem | 400 | Body text, inputs, list items |
| `--text-lg` | 1.125rem (18px) | 1.75rem | 500 | Card titles, emphasized body |
| `--text-xl` | 1.25rem (20px) | 1.75rem | 600 | Section headers, dialog titles |
| `--text-2xl` | 1.5rem (24px) | 2rem | 700 | Page titles |
| `--text-3xl` | 1.875rem (30px) | 2.25rem | 700 | Hero titles, dashboard headers |
| `--text-4xl` | 2.25rem (36px) | 2.5rem | 800 | Stat numbers, landing hero |
| `--text-5xl` | 3rem (48px) | 1 | 800 | Marketing hero (rare) |

### Display (Orbitron)

| Token | Size | Usage |
|-------|------|-------|
| `--display-sm` | 1.25rem (20px) | Badge labels, AI labels |
| `--display-md` | 2rem (32px) | Section numbers (Report) |
| `--display-lg` | 3.5rem (56px) | Website Score, large metrics |

### Gradient Text

```css
--gradient-text: linear-gradient(135deg, var(--neon-cyan), var(--brand-primary));
--gradient-text-warm: linear-gradient(135deg, var(--neon-gold), var(--color-warning));
```

Apply with: `bg-gradient-to-r from-neon-cyan to-brand-primary bg-clip-text text-transparent`

---

## 4. Spacing System

### 4px Base Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-0` | 0 | Zero spacing |
| `--space-1` | 0.25rem (4px) | Icon gaps, tight inline |
| `--space-2` | 0.5rem (8px) | Inline elements, badge padding |
| `--space-3` | 0.75rem (12px) | Compact sections |
| `--space-4` | 1rem (16px) | Default component spacing |
| `--space-5` | 1.25rem (20px) | Card padding |
| `--space-6` | 1.5rem (24px) | Section gaps |
| `--space-8` | 2rem (32px) | Page section margins |
| `--space-10` | 2.5rem (40px) | Large section separators |
| `--space-12` | 3rem (48px) | Page-level padding |
| `--space-16` | 4rem (64px) | Hero spacing, marketing |

### Container Widths

| Token | Value | Usage |
|-------|-------|-------|
| `--container-sm` | 640px | Forms, narrow pages |
| `--container-md` | 768px | Content pages |
| `--container-lg` | 1024px | Standard dashboard |
| `--container-xl` | 1280px | Wide dashboards, super admin |
| `--container-2xl` | 1536px | Analytics, data-heavy pages |

### Layout Constants

| Token | Value |
|-------|-------|
| Sidebar width | 256px (64 in Tailwind: w-64) |
| Topbar height | 56px (h-14) |
| Mobile header | 56px |
| Page padding desktop | `--space-8` (32px) |
| Page padding mobile | `--space-4` (16px) |

---

## 5. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-none` | 0 | Tables, dividers |
| `--radius-sm` | 0.25rem (4px) | Small inputs, tags |
| `--radius-md` | 0.5rem (8px) | Buttons, inputs, cards |
| `--radius-lg` | 0.75rem (12px) | Large cards, dialogs |
| `--radius-xl` | 1rem (16px) | Modals, drawers |
| `--radius-2xl` | 1.5rem (24px) | Marketing cards |
| `--radius-full` | 9999px | Pills, avatars, badges |

---

## 6. Elevation & Shadows

### Glass Layer System

| Layer | Z-Index | Usage |
|-------|---------|-------|
| Layer 0 | 0 | Page content |
| Layer 1 | 10 | Cards, raised surfaces |
| Layer 2 | 20 | Sticky headers |
| Layer 3 | 30 | Dropdowns, popovers |
| Layer 4 | 40 | Modals, dialogs |
| Layer 5 | 50 | Drawers, side panels |
| Layer 6 | 60 | Tooltips, toasts, notifications |
| Layer 7 | 70 | Command palette |

### Shadow Tokens

```css
--shadow-sm:  0 1px 2px rgba(0,0,0,0.3);
--shadow-md:  0 4px 6px rgba(0,0,0,0.4);
--shadow-lg:  0 10px 25px rgba(0,0,0,0.5);
--shadow-xl:  0 20px 50px rgba(0,0,0,0.6);
--shadow-glow-cyan: 0 0 20px rgba(0,245,255,0.15);
--shadow-glow-pink: 0 0 20px rgba(255,0,229,0.15);
```

---

## 7. Motion Design

### Philosophy

Animation serves four purposes:
1. **Direction** — where did this come from, where is it going?
2. **Confirmation** — your action was registered
3. **Feedback** — something is happening (loading, processing)
4. **Delight** — moments that make the product feel premium

### Duration Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-instant` | 100ms | Micro-interactions, hover states |
| `--duration-fast` | 200ms | Button presses, toggles |
| `--duration-normal` | 300ms | Page transitions, card animations |
| `--duration-slow` | 500ms | Modals, drawers, reveals |
| `--duration-cinematic` | 800ms-1200ms | AI generation animations |

### Easing

```css
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in:      cubic-bezier(0.4, 0, 1, 1);
--ease-out:     cubic-bezier(0, 0, 0.2, 1);
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-bounce:  cubic-bezier(0.68, -0.55, 0.27, 1.55);
```

### Preset Animations

| Name | Duration | Easing | Usage |
|------|----------|--------|-------|
| `fade-in` | 200ms | ease-out | Content appearing |
| `slide-up` | 300ms | ease-spring | Cards, list items |
| `slide-down` | 300ms | ease-out | Dropdowns |
| `scale-in` | 200ms | ease-spring | Dialogs, modals |
| `pulse-glow` | 2s infinite | ease-in-out | AI processing indicator |
| `scan-line` | 3s linear | - | AI generation cinematic |
| `count-up` | 1s | ease-out | Stat numbers, score counter |

### Page Transitions

- Dashboard → Sub-page: `fade-in` + `slide-up` on content area only
- AI Flow steps: Horizontal slide between steps (300ms)
- Modal open: `scale-in` + backdrop fade (300ms)
- Drawer open: `slide-in-right` (300ms)

---

## 8. Iconography

### Icon Library: Lucide

All icons use **Lucide React** exclusively. Never mix icon libraries.

### Sizing Convention

| Size | Value | Usage |
|------|-------|-------|
| `sm` | 14px | Badges, inline, captions |
| `md` | 16px | Buttons, inputs, list items |
| `lg` | 20px | Card icons, section headers |
| `xl` | 24px | Stat card icons, hero areas |
| `2xl` | 32px | Empty states |

### Color

Icons inherit currentColor. Use semantic color classes:
- Default: `text-zinc-400`
- Active: `text-brand-primary`
- Muted: `text-zinc-600`
- Success: `text-green-500`
- Danger: `text-red-500`

---

## 9. Accessibility

### Standards
- **WCAG 2.1 Level AA** minimum across all screens
- All interactive elements are keyboard-navigable
- Focus rings are visible and consistent
- Screen reader labels on all non-text content

### Contrast
- Text on backgrounds: minimum 4.5:1 ratio
- Large text (≥18px bold): minimum 3:1 ratio
- Dark theme verified against WCAG contrast grid

### Focus Ring

```css
--focus-ring: 0 0 0 2px var(--surface-root), 0 0 0 4px var(--brand-primary);
```

Applied to all interactive elements on `:focus-visible`. Never remove focus rings.

### Keyboard Navigation
- **Tab:** Next interactive element
- **Shift+Tab:** Previous
- **Enter/Space:** Activate
- **Escape:** Close modals, dialogs, dropdowns
- **Cmd/Ctrl+K:** Command palette (global)
- **Arrow keys:** Navigate within lists, menus, date pickers

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

`useReducedMotion()` hook available for programmatic checks.

---

## 10. Responsive Breakpoints

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `sm` | 640px | Mobile landscape, small tablets |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large displays, ultra-wide |

### Responsive Strategy

1. **Mobile-first.** All components default to mobile layout.
2. **Sidebar becomes hamburger** below `lg` breakpoint.
3. **Tables scroll horizontally** on mobile instead of collapsing.
4. **Forms stack vertically** on mobile.
5. **Card grids:** 1 col (mobile) → 2 col (sm) → 3 col (lg) → 4 col (xl)
6. **Modals become bottom sheets** on mobile.
7. **Drawers become full-screen** on mobile.

---

## 11. Component Library Architecture

### Component Categories

```
Primitives/
  Button, Input, Select, Checkbox, Radio, Switch, Textarea, Badge, Avatar

Layout/
  Container, Grid, Stack, Divider, Sidebar, Topbar, Shell

Overlay/
  Dialog, Drawer, Popover, Tooltip, Dropdown, ContextMenu, Toast

Navigation/
  Breadcrumb, Tabs, Pagination, Stepper, CommandPalette

Data/
  Table, DataGrid, Chart, MetricCard, StatCard, Timeline, ActivityFeed

Feedback/
  Skeleton, EmptyState, Progress, Spinner, Alert

AI/
  StrategyCard, TemplateCard, WebsiteScoreCard, SectionToggle,
  AIChatBubble, GenerationProgress, DeploymentCard, WizardStep

Content/
  ProductCard, GalleryCard, OrderCard, CustomerCard, DomainCard,
  MediaUpload, FileDropZone, RichTextEditor, DevicePreview

Marketing/
  HeroCard, PricingCard, FeatureCard, TestimonialCard, CTASection
```

### Component Specification Template

Every component is documented with:
```
Name:       Component name
Purpose:    What it does and when to use it
Variants:   All visual variants
Sizes:      sm | md | lg | xl (where applicable)
States:     default, hover, active, focus, disabled, loading, error
Tokens:     Design tokens consumed
A11y:       Accessibility notes
Slot:       Composition slots (if compound component)
Mobile:     Mobile behavior
Examples:   2-3 usage examples
```

### Buttons (Example Specification)

**Name:** `Button`

**Purpose:** Primary action trigger. Three hierarchy levels.

**Variants:**
- `primary` — Solid brand-primary bg, white text, cyan glow on hover
- `secondary` — Glass border, transparent bg, white text, border glow on hover
- `ghost` — No bg, no border, white text, subtle bg on hover
- `danger` — Red bg, white text (for destructive actions)
- `link` — Looks like text link, underline on hover

**Sizes:** `sm` (h-8 px-3 text-sm), `md` (h-10 px-4 text-sm), `lg` (h-12 px-6 text-base), `xl` (h-14 px-8 text-lg)

**States:** default, hover, active, focus-visible, disabled, loading (spinner replaces children)

**Tokens:** `--brand-primary`, `--radius-md`, `--duration-fast`, `--focus-ring`

**A11y:** `<button>` element, `aria-disabled` when loading, `role="button"` for link variant

**Mobile:** Full-width in bottom actions, regular width otherwise

**Usage:**
```tsx
<Button variant="primary" size="lg">Generate Website</Button>
<Button variant="ghost" size="sm" loading>Saving...</Button>
```

---

## 12. AI-Specific Design Patterns

### The AI-Generation Cinematic

AI generation screens share a visual language distinct from the dashboard:

- **Darker backgrounds:** `#050508` instead of `#09090b`
- **Larger typography:** Headings use `--text-3xl` to `--text-5xl`
- **Centered layouts:** Content is vertically and horizontally centered
- **Scan line animation:** Subtle horizontal scan during processing
- **Particle/glow effects:** Ambient cyan particles near progress indicators
- **Score reveals:** Numbers count up with spring animation
- **Step indicators:** Horizontal dots showing position in flow

### AI Card Variants

**Strategy Card:**
```
┌─────────────────────────┐
│ ○ Fast          30 sec  │  ← Selectable, border glows on selection
│ Uses detected data      │
│ Best for quick preview  │
└─────────────────────────┘
```
- Selectable radio-card pattern
- Border: zinc-800 default, brand-primary when selected
- Glow: `--shadow-glow-cyan` on selected

**Template Card:**
```
┌──────────┐
│   🎮     │
│ Gaming   │
│ Creator  │
└──────────┘
```
- 2×4 or 3×3 grid depending on viewport
- Icon + label + subtle description on hover
- `--radius-xl`, glass bg

**Website Score Card:**
```
┌───────────────────────┐
│                       │
│     ┌───────────┐     │
│     │    92%    │     │  ← Score ring (SVG circular progress)
│     └───────────┘     │
│                       │
│  Detected    Missing  │
│  ✓ Brand     ⚠ Email │
│  ✓ Colors    ⚠ Domain│
│                       │
└───────────────────────┘
```
- Large centered score ring with gradient stroke
- Two-column checklist below
- Counts up from 0 to final score on appear

**Deployment Card:**
```
┌──────────────────────────────┐
│  🚀 Deploying                │
│  techcreator.creator...      │
│                              │
│  ✅ Creating Tenant   1.2s   │
│  ✅ Creating Database 0.8s   │
│  ▶️  Generating Pages  1.5s  │
│  ⏳ Creating Dashboard       │
│                              │
│  ████████████░░░░  4/8      │
└──────────────────────────────┘
```
- Steps animate in sequence
- Completed steps get green check + strikethrough
- Active step has pulse animation
- Pending steps are muted
- Total progress bar at bottom

**Section Toggle Grid:**
```
┌──────────────────────────────────────┐
│ 📋 Sections to include               │
│                                      │
│ ☑ Hero          ☑ Products           │
│ ☑ About         ☑ Gallery            │
│ ☐ FAQ           ☐ Blog               │
│ ☐ Newsletter    ☐ Testimonials       │
└──────────────────────────────────────┘
```
- 2-column checkbox grid
- Checked items: cyan accent border, subtle glow
- Unchecked items: muted, no border
- Toggle animates between states

---

## 13. CSS Architecture

### Layer Model (Tailwind v4 `@layer`)

```
@layer base       → CSS reset, typography defaults, :root variables
@layer components → Reusable component classes (admin-card, admin-btn, etc.)
@layer utilities  → Single-purpose utilities (neon-cyan, glow-pink, etc.)
```

### Class Naming Convention

- **Existing classes preserved:** `admin-card`, `admin-btn-cyan`, `neon-cyan`, etc.
- **New classes follow:** `cs-{category}-{variant}` pattern
  - `cs-btn-primary`, `cs-card-glass`, `cs-badge-success`
  - `cs-ai-score-ring`, `cs-ai-section-toggle`
- **Never rename existing classes.** Extend only.

### Custom Utility Classes (preserved from current codebase)

```css
.admin-card           → Glass card base
.admin-card-hover     → Glass card with cyan hover border/glow
.admin-btn-cyan       → Cyan gradient button
.admin-gradient-text  → Gradient text (cyan→purple)
.neon-cyan            → Cyan text-shadow glow
.glow-cyan            → Cyan box-shadow glow
```

### Tailwind Configuration Strategy

Custom tokens injected via `tailwind.config.ts` `extend.theme`:
- Colors map to CSS variables: `colors.brand.primary: 'var(--brand-primary)'`
- Fonts: `fontFamily.sans`, `fontFamily.display`
- Border radius: `borderRadius` mapped to design tokens
- Animation keyframes: `scan-line`, `pulse-glow`, `count-up`

---

## 14. Interactive States

Every interactive component must handle this state matrix:

| State | Visual | Duration |
|-------|--------|----------|
| Default | Resting appearance | — |
| Hover | Subtle bg/border change, cursor pointer | 150ms |
| Active/Pressed | Slight scale-down (0.98), deeper bg | 100ms |
| Focus-visible | Focus ring (`--focus-ring`) | instant |
| Disabled | Opacity 40%, cursor not-allowed | — |
| Loading | Skeleton or spinner replacing content | — |
| Error | Red border, error text below | — |
| Success | Green check, brief glow animation | 2000ms auto-dismiss |

---

## 15. Dashboard Shell Architecture

### Shell Structure

```
┌──────────────────────────────────────────────────────┐
│ Topbar (optional, h-14)            🔍  🔔  👤       │
├────────┬─────────────────────────────────────────────┤
│        │                                             │
│ Sidebar│          Content Area                       │
│        │          max-w-6xl mx-auto                  │
│ w-64   │          px-8 desktop                       │
│        │          px-4 mobile                        │
│        │          pt-8 desktop                       │
│        │          pt-20 mobile (topbar offset)       │
│        │                                             │
└────────┴─────────────────────────────────────────────┘
```

### Sidebar Component

- Fixed left, full height, glass bg
- **Collapsed state:** Icon-only (64px wide)
- **Expanded state:** Icon + label (256px wide)
- **Mobile:** Hamburger toggle, slides in from left as overlay
- **Active item:** Cyan left border + subtle bg highlight
- **Job groups:** Collapsible sections with group labels
- **Bottom section:** User avatar + name + sign out

### Topbar Component

- Optional. Used on pages that benefit from it.
- **Left:** Breadcrumbs or page title
- **Center:** (empty or command palette trigger)
- **Right:** Search button, notification bell, user menu
- **Mobile:** Fixed top, shows hamburger + logo

---

*CreatorStore Design System v1.0 — July 2026*
*All tokens final. All components specified. Ready for implementation.*
