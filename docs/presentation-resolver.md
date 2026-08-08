# Presentation Resolver

**Track:** RCCF-LAUNCH-TRACK-04B (Phase 1)

`SectionPresentationResolver` is the *single* canonical presentation resolution
point. Located at `src/modules/section-presentation/application/resolver.ts`,
re-exported from `@/modules/section-presentation`.

## API

```ts
class SectionPresentationResolver {
  resolveTitle(p, defaultTitle): string | null        // override → default → null
  resolveDescription(p): string | null                // override → null
  resolveHideTitle(p): boolean                        // default false
  resolveVisible(p): boolean                          // default true
  resolveHideWhenEmpty(p, moduleId): boolean          // optional→true, permanent→false
  resolveVisibilityMode(p, moduleId): "always"|"auto"|"hidden"
  resolve(p, defaultTitle, moduleId): ResolvedPresentation
}
export const sectionPresentationResolver;
```

`resolve()` returns the full decision in one call:

```ts
interface ResolvedPresentation {
  title: string | null;
  description: string | null;
  hideTitle: boolean;
  visible: boolean;
  hideWhenEmpty: boolean;
  visibilityMode: "always" | "auto" | "hidden";
}
```

## Resolution rules (canonical)

| Question | Rule |
| --- | --- |
| Displayed title | `titleOverride` → canonical default (registry/LayoutEngine) → renderer fallback |
| Description | `descriptionOverride` → nothing |
| Hide title | `hideTitle` (default `false`) |
| Master visibility | `visible` (default `true`); `false` ⇒ `visibilityMode: "hidden"` |
| Hide when empty | `hideWhenEmpty`; **optional** sections default `true`, **permanent** sections default `false` (ignored) |
| `visibilityMode` | `hidden` if not visible; `auto` if hide-when-empty and optional; else `always` |

## Render decision

`shouldRenderSection(config)` in `application/runtime.ts` is the companion
helper the storefront page and every renderer use:

```ts
shouldRenderSection(config)  // false when visibilityMode==="hidden"
                             // false when visibilityMode==="auto" && hasContent===false
                             // true otherwise
```

`config.visibilityMode` and `config.hasContent` are computed **once** by the
LayoutEngine (`composeSectionConfig`); `hasContent` is derived from the
canonical `sectionHasContent(baseId, content)` helper. No renderer duplicates
this decision.

## Who consumes it

- `LayoutEngine.composeSectionConfig` — resolves presentation + hasContent per section.
- Registry renderers — `useVisibility(props)` (wraps `shouldRenderSection`) + `SectionHeading`.
- `src/app/[domain]/page.tsx` and `interactive-canvas.tsx` — filter empty/hidden sections before rendering.

## Backward compatibility

`resolveSectionPresentation()` remains exported and delegates to the resolver.
No overrides ⇒ identical defaults ⇒ zero migration.
