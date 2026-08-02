# Theme Consumption Map — IMPLEMENTATION-24

## Semantic CSS variables (the integration contract)

| Variable | Meaning | Derived from |
|---|---|---|
| `--brand-primary` | primary accent | theme colors.primary |
| `--brand-secondary` | secondary accent | colors.secondary |
| `--brand-accent` | accent | colors.accent |
| `--surface-root` | page background | colors.background |
| `--surface-base` | base surface (legacy) | colors.foreground |
| `--surface-card` | card background | derived from background (light/dark aware) |
| `--surface-card-hover` | hover surface | derived (stronger) |
| `--border` | border color | derived (white/black by luminance) |
| `--text-primary` | primary text | colors.foreground |
| `--text-secondary` | secondary text | colors.muted |
| `--text-muted` | muted text | colors.muted |
| `--on-primary` | text on accent buttons | luminance(primary) |
| `--primary-hover` | hover accent | shade(primary, 0.82) |
| `--live` | live indicator | fixed danger red |

## Renderer mapping (replaced hardcoded → semantic)

| Hardcoded (before) | Semantic (after) |
|---|---|
| `bg-zinc-900` / `bg-zinc-900/50` | `bg-[var(--surface-card,#18181B)]` / `/60` |
| `bg-zinc-800`, `bg-white/5`, `hover:bg-white/10` | `bg-[var(--surface-card-hover,#27272A)]` |
| `border-white/10`, `border-white/20` | `border-[var(--border,rgba(255,255,255,0.08))]` |
| `hover:border-white/25|30|40` | `hover:border-[var(--brand-primary,#6366F1)]` |
| `text-white`, `text-zinc-300` | `text-[var(--text-primary,#FAFAFA)]` |
| `text-zinc-400` | `text-[var(--text-secondary,#A1A1AA)]` |
| `text-zinc-500|600|700` | `text-[var(--text-muted,#71717A)]` |
| `bg-zinc-950` | `bg-[var(--surface-root,#0A0A0B)]` |

## Renderers updated (all non-Hero)

Products, Gallery, Services, Courses, Testimonials, FAQ, Timeline, Games,
Footer, Links, Newsletter, Contact, Content Feed, Pricing.

The Hero is intentionally left as-is (dark gradient media hero; CTA buttons
already consume `--brand-secondary`). The live badge uses `--live`.
