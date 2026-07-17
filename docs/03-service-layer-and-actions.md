# 03 — Service Layer & Server Actions

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Page Component (Server)                              │
│    ↓ calls                                            │
│  Service Layer (src/services/)                        │
│    ↓ uses                                             │
│  Prisma Client (src/generated/prisma/)                │
│    ↓ talks to                                         │
│  PostgreSQL (Supabase)                                │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Client Component (useActionState / startTransition)  │
│    ↓ calls                                            │
│  Server Action (src/actions/)                         │
│    ↓ guards with requireAuth                          │
│    ↓ calls service methods                            │
│    ↓ calls logAction (audit)                          │
│    ↓ calls revalidatePath                             │
└──────────────────────────────────────────────────────┘
```

## The `requireAuth` Guard

Every server action file defines a local `requireAuth` function. This is the **single source of auth truth** for admin operations:

```typescript
async function requireAuth(tenantId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN" && session.user.tenantId !== tenantId) {
    throw new Error("Forbidden");
  }
}
```

**Three outcomes:**

| Condition | Result |
|-----------|--------|
| No session | `"Unauthorized"` |
| `SUPER_ADMIN` | Always allowed (acts on any tenant) |
| `ADMIN` with matching `tenantId` | Allowed |
| `ADMIN` with wrong `tenantId` | `"Forbidden"` |

**Two variants exist:**

1. **Guard with parameter** (`product.actions.ts`, `gallery.actions.ts`, etc.) — Parent component passes `tenantId`. Admin must match.
2. **Guard without parameter** (`domain.actions.ts`, `games.actions.ts`) — Derives `tenantId` from `session.user.tenantId` directly. Simpler when the action doesn't receive tenantId as a separate argument.

## The Audit Trail (`logAction`)

Every mutating action in every file writes an audit entry. The pattern is consistent:

```typescript
// 1. Import
import { logAction } from "@/lib/audit";

// 2. Call after successful mutation
await logAction(tenantId, "createProduct", {
  productId: product.id,
  name: product.name,
});
```

**How it works (`src/lib/audit.ts`):**

```typescript
export async function logAction(
  tenantId: string,
  action: string,
  metadata: Record<string, unknown> = {},
  tx?: SqlExecutor,  // ← optional transaction client for atomic writes
): Promise<void> {
  const client = tx || prisma;
  await client.$executeRawUnsafe(
    `INSERT INTO "AuditLog" ("id", "tenantId", "action", "metadata", "createdAt")
     VALUES (gen_random_uuid(), $1, $2, $3::jsonb, NOW())`,
    tenantId, action, JSON.stringify(sanitizeMetadata(metadata)),
  );
}
```

- Uses raw SQL for performance (avoids Prisma overhead for write-only operations)
- Accepts an optional transaction client (`tx`) — when passed, the audit write is **atomic** with the data mutation
- `sanitizeMetadata` recursively redacts keys matching: `key`, `secret`, `token`, `password`, `authorization`, `credential`, `api_key`

### Files with `logAction` wired

| File | Actions logged |
|------|---------------|
| `product.actions.ts` | `createProduct`, `toggleProductStatus`, `updateProduct`, `deleteProduct`, `reorderProducts` |
| `milestone.actions.ts` | `createMilestone`, `updateMilestone`, `deleteMilestone` |
| `gallery.actions.ts` | `createGalleryItem`, `deleteGalleryItem`, `reorderGallery` |
| `link.actions.ts` | `createLink`, `toggleLinkStatus`, `reorderLinks`, `deleteLink` |
| `content-feed.actions.ts` | `togglePinItem`, `toggleHideItem`, `deleteFeedItem` |
| `affiliate.actions.ts` | `createAffiliate`, `updateAffiliate`, `deleteAffiliate`, `incrementAffiliateClicks`, `toggleAffiliateActive` |
| `games.actions.ts` | `createGame`, `updateGame`, `deleteGame` |
| `billing.actions.ts` | `createSubscriptionCheckout` |
| `domain.actions.ts` | `attachCustomDomain`, `removeCustomDomain`, `verifyDomain` |
| `settings.actions.ts` | `updateHeroData`, `updateHeroPartial` |

## Atomic `patchHeroData` Pattern

**Problem:** When two admin users edit hero settings concurrently, a read-modify-write cycle can overwrite each other's changes.

**Solution:** PostgreSQL atomic JSONB merge with no read before write:

```typescript
// src/services/settings.service.ts
static async patchHeroData(
  tenantId: string,
  data: Record<string, unknown>,
  tx?: PrismaTransaction,
): Promise<void> {
  const client = tx || prisma;
  await client.$executeRawUnsafe(
    `INSERT INTO "Setting" ("id", "tenantId", "key", "value")
     VALUES (gen_random_uuid(), $1, 'hero_data', $2::jsonb)
     ON CONFLICT ("tenantId", "key")
     DO UPDATE SET "value" =
       COALESCE("Setting"."value", '{}'::jsonb) || EXCLUDED."value"`,
    tenantId, JSON.stringify(data),
  );
}
```

The action layer wraps this in a transaction with audit logging:

```typescript
// src/actions/settings.actions.ts
await prisma.$transaction(async (tx) => {
  await SettingsService.patchHeroData(tenantId, sparseData, tx);
  await logAction(tenantId, "updateHeroData", { fields: Object.keys(sparseData) }, tx);
});
```

## Vercel Domain Management

`src/services/vercel.service.ts` wraps the Vercel API with typed interfaces:

| Method | Endpoint | Returns |
|--------|----------|---------|
| `addDomain(domain)` | `POST /v10/projects/{id}/domains` | `{ success, domain, error?, vercelResponse? }` |
| `getDomainStatus(domain)` | `GET /v9/projects/{id}/domains/{domain}` | `{ domain, verified, verification?: [{ type, domain, value }] }` |
| `verifyDomain(domain)` | `POST /v9/projects/{id}/domains/{domain}/verify` | Calls verify, then polls status |
| `removeDomain(domain)` | `DELETE /v9/projects/{id}/domains/{domain}` | `{ success, domain, error? }` |

**Orchestrated by `src/actions/domain.actions.ts`:**

```
1. Admin enters "myshop.com" in UI
2. attachCustomDomain action:
   a. VercelService.addDomain("myshop.com") → returns DNS verification records
   b. prisma.tenant.update({ customDomain: "myshop.com" })
   c. logAction(tenantId, "attachCustomDomain", { domain })
3. Admin configures DNS at registrar
4. Admin clicks "Verify" → verifyDomain action:
   a. VercelService.verifyDomain(domain) → returns verified status
   b. logAction(tenantId, "verifyDomain", { verified })
5. Middleware picks up customDomain → public page routes correctly
```

## Public vs Admin Action Separation

| Aspect | Public Actions | Admin Actions |
|--------|---------------|---------------|
| Example | `contact.actions.ts` | `product.actions.ts` |
| Auth method | `getTenantContext()` → reads `x-tenant-host` header | `requireAuth(tenantId)` → reads session JWT |
| Session required | No (fans aren't logged in) | Yes |
| Use case | Contact form submissions from fans | All admin CRUD operations |
| tenantId source | Request context (domain-based) | Session (`session.user.tenantId`) |

## Service Layer Inventory

| Service | Purpose |
|---------|---------|
| `affiliate.service.ts` | Affiliate link CRUD + click increment |
| `contact.service.ts` | Contact form submissions CRUD |
| `content-feed.service.ts` | Public feed queries + admin togglePin/toggleHide/delete |
| `gallery.service.ts` | Gallery CRUD + reorder |
| `games.service.ts` | Games CRUD |
| `product.service.ts` | Products CRUD + toggleActive |
| `public.service.ts` | Assembles full public page data (profile + hero + 5 sections) |
| `razorpay.service.ts` | Creates linked Razorpay route accounts |
| `settings.service.ts` | Settings key-value store, hero_data, influencer_data, API keys |
| `social-api.service.ts` | YouTube/Twitch stat fetching |
| `storage.service.ts` | Supabase file upload (requires SERVICE_ROLE_KEY) + path extraction |
| `super-admin.service.ts` | Platform-level stats + tenant listing |
| `timeline.service.ts` | Timeline events CRUD |
| `vercel.service.ts` | Vercel domain CRUD + status check |
