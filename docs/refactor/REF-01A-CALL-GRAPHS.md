# REF-01A — Runtime Call Graphs

## Products: Admin Route

```
Request: GET /admin/products
  ↓
admin/products/page.tsx (server component)
  ├─ requireTenant() → getServerSession → lifecycleService.resolve()
  └─ productService.list(tenantId)        ← features/products/service.ts
       └─ prisma.product.findMany({ where: { tenantId } })
```

**Note:** This is the ONLY active product read path. `actions/product.actions.ts` is dead.

## Gallery: Admin Route

```
Request: GET /admin/gallery
  ↓
admin/gallery/page.tsx (server component)
  ├─ requireTenant()
  └─ dynamic import: fetchGalleryItems()
       └─ GalleryService.fetch(params)    ← lib/gallery/service.ts
            └─ prisma.galleryImage.findMany()
```

## Settings: Admin Route

```
Request: GET /admin/settings
  ↓
admin/settings/page.tsx
  ├─ SettingsService.getInfluencerData()  ← services/settings.service.ts
  │    └─ prisma.setting.findUnique({ key: "influencer_data" })
  ├─ SettingsService.getHeroData()
  │    └─ prisma.setting.findUnique({ key: "hero_data" })
  └─ SettingsService.getThemeConfig()
       └─ SQL: SELECT value FROM "Setting" WHERE key='theme_config'

POST settings.actions.ts updateInfluencerData()
  └─ SettingsService.updateInfluencerData()
       └─ prisma.setting.upsert({ key: "influencer_data" })
```

## Publishing: Dashboard Publish

```
Dashboard "Publish Now" button
  ↓
StorefrontStatusCard.handlePublish()
  ↓
publish.actions.ts :: publishWebsite()
  ├─ requireTenant()
  └─ PublishingService.publish(tenantId)
       ├─ loadFromBuilder(websiteId)
       │    ├─ BuilderService.load()       ← Page/Section/Block tables
       │    └─ Fallback: snapshot / artifact
       ├─ publishRepository.createPublish()
       │    └─ $transaction
       │         ├─ PublishSnapshot.create()
       │         └─ PublishStatus.upsert()
       ├─ platformEventBus.publish("WebsitePublished")
       └─ revalidatePath()
```

## Storefront: Public Request

```
Request: GET creator.influencer.space
  ↓
middleware.ts
  ├─ getToken()
  └─ new LifecycleService().resolveFromToken()
  ↓
[domain]/page.tsx
  ├─ getPageData(slug)
  │    ├─ tenant.findFirst()
  │    └─ getPublishedPageData(tenantId)
  │         ├─ website.findUnique()
  │         ├─ publishSnapshotService.getLive()   ← snapshot rendering
  │         └─ getPublicPageData()                ← ALWAYS fetched (legacy)
  │
  ├─ extractSlots(snapshot) → [{ moduleId, config }]
  │
  └─ slots.map(slot →
       ComponentErrorBoundary →
         DataBoundRenderer →
           ComponentRenderer →
             componentRegistry.get(moduleId) →
               <Renderer />)
       OR
       FallbackStorefront (dynamic import of legacy sections)
```

## Builder: Page Load

```
Request: GET /builder
  ↓
builder/page.tsx → BuilderLoader → BuilderWorkspace
  ↓
useEffect:
  ├─ loadBuilderPages()
  │    ├─ tryLoadFromArtifact()            ← Setting(builder_artifact)
  │    └─ BuilderService.load()            ← Page/Section/Block tables
  │
  └─ getPublishStatus()
       └─ PublishingService.getStatus()
```
