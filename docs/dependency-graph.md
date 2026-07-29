# Dependency Graph

> **Part of:** [Creatos Platform Architecture v1](platform-architecture-v1.md)

---

## 1. Platform Dependency Graph

```mermaid
graph TD
    subgraph "Presentation Layer"
        Admin[Admin UI]
        Storefront[Storefront]
        Builder[Builder]
    end

    subgraph "Business Layer"
        AdminContent[Admin Content Pages<br/>Hero, Products, Gallery, etc.]
        Dashboard[Dashboard]
        CreationWizard[Creation Wizard]
        Onboarding[Onboarding]
    end

    subgraph "Service Layer"
        Publishing[PublishingService]
        Provisioning[ProvisioningService]
        Generation[WebsiteGeneration]
        Navigation[NavigationService]
        AggService[WebsiteAggregateService]
        Health[WebsiteHealthEngine]
    end

    subgraph "Registry Layer"
        ThemeReg[ThemeRegistry]
        BlueprintReg[BlueprintRegistry]
        MktplaceReg[MarketplaceRegistry]
        CapReg[CapabilityRegistry]
        IndReg[IndustryRegistry]
        CompReg[ComponentRegistry]
    end

    subgraph "Data Layer"
        BusinessDB[(Business DB<br/>Products, Gallery,<br/>Settings, Brand, etc.)]
        PublishDB[(Publish DB<br/>PublishSnapshot,<br/>PublishStatus)]
    end

    Admin --> AdminContent
    Admin --> Dashboard
    Admin --> CreationWizard
    Admin --> Builder
    Admin --> Publishing

    AdminContent --> BusinessDB
    Dashboard --> AggService
    Dashboard --> Health
    CreationWizard --> BlueprintReg
    CreationWizard --> ThemeReg
    CreationWizard --> IndReg
    CreationWizard --> CapReg

    Builder --> Publishing
    Builder --> ThemeReg

    Publishing --> AggService
    Publishing --> Navigation
    Publishing --> ThemeReg
    Publishing --> BusinessDB
    Publishing --> PublishDB

    Provisioning --> BusinessDB
    Generation --> AggService
    Generation --> Provisioning
    Generation --> Publishing

    AggService --> BusinessDB
    Health --> BusinessDB

    Storefront --> PublishDB
    ThemeReg --> ThemeResolver[ThemeResolver]
```

## 2. Publishing Pipeline

```mermaid
sequenceDiagram
    participant Admin
    participant PublishingService
    participant BuilderService
    participant AggregateService
    participant ThemeResolver
    participant NavigationService
    participant PublishRepository

    Admin->>PublishingService: publish(tenantId)
    par
        PublishingService->>BuilderService: loadPages()
        PublishingService->>AggregateService: build(tenantId)
        PublishingService->>ThemeResolver: resolveForSnapshot(themeId)
        PublishingService->>NavigationService: getOrGenerate(tenantId)
    end
    PublishingService->>PublishRepository: createPublish(snapshot)
    PublishRepository-->>PublishingService: version
    PublishingService-->>Admin: { success, version }
```

## 3. Storefront Request

```mermaid
sequenceDiagram
    participant Browser
    participant Middleware
    participant Route
    participant TenantDB
    participant SnapshotService
    participant LayoutEngine
    participant Renderer

    Browser->>Middleware: GET creatorstore.com/creatorname
    Middleware->>Route: Rewrite to /[domain]
    Route->>TenantDB: Find tenant by subdomain
    TenantDB-->>Route: tenantId
    Route->>SnapshotService: getLive(websiteId)
    SnapshotService-->>Route: PublishedSnapshot
    Route->>LayoutEngine: resolve(snapshot)
    LayoutEngine-->>Route: StorefrontDocument
    Route->>Renderer: Render sections
    Renderer-->>Browser: HTML
```

## 4. Theme Resolution

```mermaid
graph LR
    ThemeDef[ThemeDefinition] --> ThemeReg[ThemeRegistry]
    ThemeReg --> ThemeResolver[ThemeResolver]
    ThemeResolver --> SnapshotTheme[PublishedSnapshot.theme]
    ThemeResolver --> Overrides[Website.themeColors]
    SnapshotTheme --> LayoutEngine[LayoutEngine.buildTheme]
    LayoutEngine --> CSSVars[CSS Custom Properties]
    CSSVars --> Storefront[Storefront]
```

## 5. Media Resolution

```mermaid
graph LR
    Upload[Upload] --> MediaService[MediaService]
    MediaService --> Asset[Asset Record]
    Asset --> AggService[WebsiteAggregateService]
    AggService --> ResolveURL[mediaService.resolveUrls]
    ResolveURL --> Snapshot[PublishedSnapshot.content]
    Snapshot --> Storefront[Storefront]
    Storefront --> CreatorImage[CreatorImage]
```

## 6. Creator Journey

```mermaid
graph TD
    Landing[Landing Page] --> Signup[Signup]
    Signup --> Choose[Choose Industry & Template]
    Choose --> Preview[Live Preview]
    Preview --> Generate[Generate Website]
    Generate --> Ready[Website Ready]
    Ready --> Dashboard[Dashboard]
    Dashboard --> Admin[Admin Pages]
    Dashboard --> Builder[Builder]
    Admin --> Publish[Publish]
    Builder --> Publish
    Publish --> Storefront[Storefront]

    style Ready fill:#22c55e,color:#000
    style Storefront fill:#3b82f6,color:#fff
```

## 7. Theme Categories & Counts

```mermaid
pie title 30 Production Themes
    "Creator" : 5
    "Business & Agency" : 4
    "Portfolio & Creative" : 4
    "Gaming" : 3
    "Luxury & Lifestyle" : 4
    "Food & Restaurant" : 4
    "Coach & Education" : 3
    "Podcast" : 3
```
