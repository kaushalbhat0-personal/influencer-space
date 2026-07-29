# Domain Map — Bounded Contexts

> **Part of:** [Creatos Platform Architecture v1](platform-architecture-v1.md)

---

## 1. Platform Domain

| Property | Value |
|----------|-------|
| **Purpose** | Core platform bootstrap, lifecycle management, event bus |
| **Owner** | Platform Team |
| **Location** | `src/lib/platform/`, `src/lib/lifecycle/` |
| **Key Files** | `bootstrap.ts`, `event-bus.ts`, `lifecycle-service.ts` |
| **Consumers** | All domains |
| **Extension Points** | Event subscriptions, lifecycle hooks |

---

## 2. Capability Domain

| Property | Value |
|----------|-------|
| **Purpose** | Feature gating, subscription limits, entitlements, upgrades |
| **Owner** | Capability Platform |
| **Location** | `src/lib/capabilities/` |
| **Key Files** | `service.ts`, `engine.ts`, `plans.ts`, `entitlements.ts`, `registry.ts`, `limits.ts` |
| **Consumers** | Builder (theme-card), Marketplace (registry), Dashboard (appearance), Billing, Provisioning |
| **Extension Points** | New feature IDs in `constants.ts`, new plan definitions in `plans.ts` |

---

## 3. Provisioning Domain

| Property | Value |
|----------|-------|
| **Purpose** | Create tenants, websites, workspaces, users |
| **Owner** | Provisioning Platform |
| **Location** | `src/lib/provisioning/` |
| **Key Files** | `provisioning-service.ts`, `provisioning-state.ts` |
| **Consumers** | Onboarding, Import, Super Admin, Demo |
| **Extension Points** | Full provisioning pipeline (only service allowed to create tenants) |

---

## 4. Publishing Domain

| Property | Value |
|----------|-------|
| **Purpose** | Build PublishedSnapshot, manage versions, preview/publish/rollback |
| **Owner** | Publishing Platform |
| **Location** | `src/lib/publishing/` |
| **Key Files** | `service.ts`, `snapshot.ts`, `repository.ts`, `snapshot-serializer.ts` |
| **Consumers** | Dashboard (publish button), Builder (save triggers draft), Onboarding, Super Admin |
| **Extension Points** | Snapshot schema versioning, event hooks, preview strategies |

---

## 5. Builder Domain

| Property | Value |
|----------|-------|
| **Purpose** | Layout composition — section order, visibility, duplication, theme preview |
| **Owner** | Builder Platform |
| **Location** | `src/features/builder/` |
| **Key Files** | `workspace.tsx`, `toolbar.tsx`, `sidebar.tsx`, `section-manager.tsx`, `theme-card.tsx` |
| **Consumers** | Creator (primary UI) |
| **Constraints** | NEVER owns content — no product/hero/gallery/SEO/profile editing |

---

## 6. Media Domain

| Property | Value |
|----------|-------|
| **Purpose** | Asset upload, storage, resolution, serving |
| **Owner** | Media Platform |
| **Location** | `src/lib/media/`, `src/components/shared/` |
| **Key Files** | `MediaService`, `CreatorImage`, `CreatorVideo` |
| **Consumers** | All admin pages (upload), Publishing (URL resolution), Storefront (rendering) |
| **Extension Points** | Storage providers, image processors, video transcoders |

---

## 7. Marketplace Domain

| Property | Value |
|----------|-------|
| **Purpose** | Discovery, search, recommendations, premium gating |
| **Owner** | Marketplace Platform |
| **Location** | `src/lib/marketplace/` |
| **Key Files** | `registry.ts`, `providers/built-in.ts`, `types.ts` |
| **Consumers** | Dashboard (recommendations), Admin (Theme Marketplace page) |
| **Constraints** | NEVER owns generation, publishing, building, or provisioning |

---

## 8. Theme Domain

| Property | Value |
|----------|-------|
| **Purpose** | Visual design — colors, typography, spacing, motion, radius |
| **Owner** | Theme Platform |
| **Location** | `src/lib/theme/` |
| **Key Files** | `registry-new.ts`, `resolver-new.ts`, `types-new.ts`, `themes/` (30 definitions) |
| **Consumers** | Builder (preview/apply), Publishing (resolve for snapshot), Storefront (render CSS vars) |

---

## 9. Website Template Domain

| Property | Value |
|----------|-------|
| **Purpose** | Website structure — pages, navigation, sections, starter content, SEO defaults |
| **Owner** | Template Platform |
| **Location** | `src/lib/blueprint/` |
| **Key Files** | `registry.ts`, `providers/built-in.ts`, `types.ts` |
| **Consumers** | Creation wizard (template selection), Builder (template name display) |
| **Extension Points** | New template definitions, inheritance chains, marketplace templates |

---

## 10. Navigation Domain

| Property | Value |
|----------|-------|
| **Purpose** | Admin sidebar navigation, storefront navigation |
| **Owner** | Navigation Platform |
| **Location** | `src/config/admin-nav.ts`, `src/lib/navigation/service.ts` |
| **Key Files** | `admin-nav.ts`, `service.ts` |
| **Consumers** | Admin layout, Storefront |

---

## 11. Dashboard Domain

| Property | Value |
|----------|-------|
| **Purpose** | Creator Control Center — metrics, health, quick actions, storefront status |
| **Owner** | Dashboard Platform |
| **Location** | `src/features/dashboard/` |
| **Key Files** | `dashboard-page.tsx`, `actions.ts`, `service.ts` |
| **Consumers** | Creator (primary landing page after onboarding) |

---

## 12. Website Health Domain

| Property | Value |
|----------|-------|
| **Purpose** | Website scoring, recommendations, next steps |
| **Owner** | Health Platform |
| **Location** | `src/lib/platform/health/` |
| **Key Files** | `engine.ts` |
| **Consumers** | Dashboard (health widget), Builder (completion badge), Website Ready page |

---

## 13. Storefront Domain

| Property | Value |
|----------|-------|
| **Purpose** | Public website rendering from PublishedSnapshot |
| **Owner** | Storefront Platform |
| **Location** | `src/app/[domain]/`, `src/lib/storefront/`, `src/lib/renderer/` |
| **Key Files** | `page.tsx`, `LayoutEngine.ts`, `data-bound.tsx`, `renderers.tsx` |
| **Constraints** | Zero DB reads at render time (except tenant resolution). Zero business logic. |

---

## 14. SEO Domain

| Property | Value |
|----------|-------|
| **Purpose** | Search engine optimization settings |
| **Owner** | SEO Platform |
| **Location** | `src/app/admin/seo/`, `src/lib/seo/` |
| **Key Files** | `service.ts` |
| **Consumers** | Storefront (metadata rendering via LayoutEngine) |

---

## 15. Analytics Domain

| Property | Value |
|----------|-------|
| **Purpose** | Dashboard metrics, activity tracking |
| **Owner** | Analytics Platform |
| **Location** | `src/app/admin/analytics/` |
| **Consumers** | Dashboard, Super Admin |

---

## 16. Future Domains

| Domain | Planned For | Dependency |
|--------|-------------|-----------|
| Super Admin | v1.1 | All existing platforms |
| Agency Workspace | v1.2 | Provisioning, Capabilities, Billing |
| Marketplace Website | v1.3 | Marketplace, Payments |
| AI Generation | v1.4 | Generation, Recommendations |
| Enterprise | v1.5 | Capabilities, Auth, Audit |
| Mobile/API | v2.0 | Storefront, Publishing |
