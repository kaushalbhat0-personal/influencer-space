# Theme Renderer Report — IMPLEMENTATION-24

## Approach

No new token system, no new renderers, no layout redesign. `renderers.tsx`
(the single ComponentRenderer suite shared by Builder and Storefront) now
consumes the runtime theme's semantic CSS variables via Tailwind arbitrary
values with safe fallbacks (`bg-[var(--surface-card,#18181B)]`).

## Coverage

| Section | Card bg | Border | Text | Hover |
|---|---|---|---|---|
| Products | `--surface-card` | `--border` | `--text-primary/secondary/muted` | `--surface-card-hover` / `--brand-primary` |
| Gallery | `--surface-card-hover` | `--border` | `--text-primary/muted` | — |
| Services | `--surface-card` | `--border` | `--text-primary/secondary/muted` | `--surface-card-hover` |
| Courses | `--surface-card` | `--border` | `--text-primary/secondary/muted` | `--surface-card-hover` |
| Testimonials | `--surface-card` | `--border` | `--text-primary/secondary/muted` | — |
| FAQ | `--surface-card` | `--border` | `--text-primary/secondary/muted` | — |
| Timeline | — | `--border` | `--text-primary/secondary/muted` | — |
| Games | `--surface-card` | `--border` | `--text-primary/secondary/muted` | — |
| Footer | — | `--border` | `--text-secondary/muted` | `--text-primary` |
| Links | `--surface-card-hover` | `--border` | `--text-primary` | `--surface-card-hover` |
| Newsletter / Contact | `--surface-card-hover` inputs | `--border` | `--text-primary/secondary` | `--brand-secondary` buttons |
| Content Feed | `--surface-card-hover` | — | `--text-primary/muted` | — |

Buttons on accent use `--brand-secondary` with `--on-primary` text where
appropriate; live badge uses `--live`.

## Intentional fallbacks

Every `var()` carries a dark-theme fallback (e.g. `#18181B`) so a renderer
never breaks if the var is momentarily unset. When the theme applies, the
fallback is overridden.
