# Coding Standards

> **Part of:** [Creatos Platform Architecture v1](platform-architecture-v1.md)

---

## 1. Architecture Rules

1. **One owner per domain** — Every domain has exactly one owner. No code outside that owner may write to its data.
2. **One canonical pipeline** — Every operation has exactly one pipeline. Never create a second path.
3. **Registries are the source of truth** — Entity definitions live in registries, not in hardcoded switches or conditionals.
4. **Capabilities gate features** — Never compare plan codes directly. Use `CapabilityService.can()` or `EntitlementService.has()`.
5. **Snapshots are immutable** — Once published, a `PublishedSnapshot` is never modified. New publications create new versions.
6. **Storefront reads snapshots only** — No business table reads at render time.
7. **Builder owns layout only** — No product/hero/gallery/SEO editing in the Builder.
8. **Marketplace owns discovery only** — No generation, publishing, building, or provisioning.

## 2. File Organization

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/              # Admin pages (grouped by domain)
│   ├── [domain]/           # Storefront route
│   ├── builder/            # Builder page
│   ├── api/                # API routes
│   └── (public)/           # Public marketing pages
├── actions/                # Server actions (one file per domain)
├── components/             # Shared UI components
├── features/               # Feature-specific client components
├── lib/                    # Business logic, services, registries
│   ├── capabilities/       # Canonical capability platform
│   ├── theme/              # Theme platform
│   ├── blueprint/          # Website template platform
│   ├── marketplace/        # Marketplace
│   ├── publishing/         # Publishing pipeline
│   ├── provisioning/       # Provisioning service
│   ├── generation/         # Website generation
│   ├── storefront/         # Storefront layout engine
│   ├── renderer/           # Section renderers
│   ├── registry/           # Component registry
│   ├── platform/           # Platform infrastructure
│   ├── builder/            # Builder service and store
│   └── content/            # Website aggregate service
├── modules/                # Domain-driven modules
├── services/               # Public-facing services
└── types/                  # Shared TypeScript types
```

## 3. Naming Conventions

### Files
- **React components:** `kebab-case.tsx` (e.g., `theme-card.tsx`, `website-panel.tsx`)
- **Services/utilities:** `kebab-case.ts` (e.g., `registry-new.ts`, `provisioning-service.ts`)
- **Test files:** `*.test.ts` next to implementation

### Variables
- **Classes:** PascalCase (`PublishingService`, `ThemeResolver`)
- **Functions:** camelCase (`createWebsite()`, `resolveForSnapshot()`)
- **Constants:** UPPER_SNAKE_CASE (`FALLBACK_THEME_ID`, `PLAN_CODES`)
- **Types/Interfaces:** PascalCase (`ThemeDefinition`, `PublishedSnapshot`)
- **Singletons:** camelCase (`themeRegistry`, `capabilityService`)

## 4. TypeScript

- **Strict mode** enabled (`strict: true` in tsconfig)
- **Avoid `any`** — Use `unknown` when type is not known, then narrow
- **Prefer `interface`** over `type` for object shapes
- **Use `type`** for unions, intersections, and tuples
- **Import types** with `import type` when only using type information
- **Export types** alongside implementations

## 5. Imports

Order:
1. Node built-ins (`crypto`, `path`)
2. External packages (`next`, `react`, `prisma`)
3. Internal aliases (`@/lib/`, `@/actions/`, `@/components/`)
4. Relative imports (`./`, `../`)

## 6. Error Handling

- **Server actions** return `{ success, data?, error? }` shaped responses
- **Services** throw exceptions for unexpected errors
- **Storefront** uses `ComponentErrorBoundary` per section (never crashes the whole page)
- **Validate inputs** at the boundary (Zod in API routes, FormData checks in actions)

## 7. Testing

- **Vitest** for unit and integration tests
- Tests are co-located with source files in `__tests__/` directories
- Test files should mirror the source file structure

## 8. Git Conventions

- **Branch names:** `feature/description`, `fix/description`, `refactor/description`
- **Commit messages:** Capitalized, imperative mood (`"Add theme override support"`, not `"added theme override"`)
- One commit per logical change

## 9. Domain Rules

When adding code to an existing domain:

1. Read the domain's key files first
2. Follow the existing patterns (service, registry, types, index)
3. Never import from a domain you don't depend on
4. Never write to another domain's database tables
5. Never create parallel pipelines

## 10. Registry Pattern

When creating a new registry:

```typescript
// types.ts — the entity contract
export interface MyEntity {
  id: string;
  // ...
}

// registry.ts — singleton + provider
export class MyRegistry {
  private providers: MyProvider[] = [];

  registerProvider(provider: MyProvider) { ... }
  getById(id: string): MyEntity | undefined { ... }
  getAll(options?: FilterOptions): MyEntity[] { ... }
}

export const myRegistry = new MyRegistry();

// provider.ts — provider interface
export interface MyProvider {
  readonly type: string;
  initialize(): void;
  getAll(): MyEntity[];
  getById(id: string): MyEntity | undefined;
}
```

## 11. Server Action Pattern

```typescript
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function myAction(input: Input): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return { success: false, error: "Unauthorized" };

  try {
    // ... business logic ...
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Action failed" };
  }
}
```

## 12. Prohibited Patterns

- ❌ Direct plan code comparisons (`if (planCode === "creator_pro")`)
- ❌ Creating tenants outside `ProvisioningService`
- ❌ Reading business tables in the storefront
- ❌ Content editing in the Builder
- ❌ Duplicate registries for the same entity type
- ❌ Hardcoded feature flags outside the capabilities system
- ❌ `any` type casts without documented justification
