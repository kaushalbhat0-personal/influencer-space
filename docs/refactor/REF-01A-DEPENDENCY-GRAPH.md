# REF-01A — Dependency Graph

## Products Domain

```
admin/products/page.tsx
  └─ @/features/products/service ─────────────── ALIVE (canonical)
       ├─ prisma.product
       └─ features/products/__tests__/

actions/product.actions.ts ────────────────────── DEAD (0 importers)
  └─ @/lib/products/service ───────────────────── TRANSITIVE DEAD
       └─ BulkActionEngine

lib/content/entities/product/service.ts ───────── ALIVE (content engine)
  └─ manifest.ts → content/api.ts → content-app.service.ts, platform.ts
```

## Gallery Domain

```
admin/gallery/page.tsx
  └─ @/actions/gallery.actions ────────────────── ALIVE
       ├─ @/lib/gallery/service ───────────────── ALIVE (canonical)
       └─ prisma.galleryImage

features/gallery/actions.ts ───────────────────── DEAD (0 importers)
  └─ features/gallery/service.ts ──────────────── DEAD
       └─ features/gallery/__tests__/ ─────────── only consumer

lib/content/entities/gallery/service.ts ───────── ALIVE (content engine)
  └─ manifest.ts → content/api.ts → content-app.service.ts
```

## Settings Domain

```
services/settings.service.ts ──────────────────── ALIVE (canonical, 4 importers)
  ├─ public.service.ts
  ├─ settings.actions.ts
  ├─ admin/settings/page.tsx
  └─ config/influencer.ts (dynamic import)

features/settings/service.ts ──────────────────── DEAD (only own tests)
features/settings/actions.ts ──────────────────── DEAD (0 importers)
```

## Website Domain

```
modules/.../website-repository.ts ─────────────── ALIVE (canonical)
  └─ provisioning-service.ts

lib/website/index.ts (barrel) ─────────────────── ALIVE
  ├─ lib/website/service.ts
  ├─ lib/website/publish.ts
  └─ showcase/service.ts ──────────────────────── only external consumer
```

## Publishing Domain

```
lib/publishing/service.ts ─────────────────────── ALIVE (orchestrator)
  ├─ lib/publishing/repository.ts ─────────────── ALIVE (canonical repo)
  └─ lib/publishing/snapshot.ts ───────────────── ALIVE (snapshot management)

modules/.../publish-status-repository.ts ──────── ALIVE
  └─ provisioning-service.ts
```

## Lifecycle Domain

```
lib/lifecycle/service.ts ──────────────────────── ALIVE (DB-backed singleton)
  └─ extends lib/lifecycle/token-resolver.ts ──── ALIVE (class only, no singleton)
  └─ required-tenant.ts
  └─ barrel: lib/lifecycle/index.ts

middleware.ts ──────────────────────────────────── ALIVE
  └─ new LifecycleService() from token-resolver
```

## Registry Domain

```
lib/registry/components/ ──────────────────────── ALIVE (ComponentRegistry)
lib/registry/facade.ts ────────────────────────── ALIVE (5 importers)
lib/registry/events.ts ────────────────────────── ALIVE (5 importers)
lib/registry/cache.ts ─────────────────────────── ALIVE (3 importers)
lib/registry/snapshot.ts ──────────────────────── ALIVE (3 importers)
lib/module/registry.ts ────────────────────────── ALIVE (2 importers)

lib/storefront/registry.ts ────────────────────── ALIVE (SectionRegistry)
  └─ lib/storefront/sections.tsx ──────────────── ALIVE (dynamic import in FallbackStorefront)
```

## Dead File Clusters

```
product.actions.ts ─── DEAD ───→ lib/products/service.ts ─── TRANSITIVE DEAD
features/gallery/actions.ts ─── DEAD ───→ features/gallery/service.ts ─── DEAD
features/products/actions.ts ─── DEAD
features/faq/actions.ts ─── DEAD
features/domains/actions.ts ─── DEAD
features/courses/actions.ts ─── DEAD
features/links/actions.ts ─── DEAD
features/integrations/actions.ts ─── DEAD
features/services/actions.ts ─── DEAD
features/storefront/actions.ts ─── DEAD
features/settings/actions.ts ─── DEAD
features/storefront/service-legacy.ts ─── DEAD
```
