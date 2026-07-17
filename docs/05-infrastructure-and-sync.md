# 05 — Infrastructure & Automation

## Configuration Files

### `vercel.json` — Function Limits & Cron

```json
{
  "functions": {
    "src/app/admin/settings/**/*": { "maxDuration": 30, "memory": 1024 }
  },
  "crons": [
    { "path": "/api/cron/sync-socials", "schedule": "0 0 * * *" }
  ]
}
```

- **Function overrides:** Settings admin pages get 30-second timeouts and 1024MB RAM. This covers the heavy `patchHeroData` JSONB merges and `logAction` writes.
- **Cron:** The social stats + content feed sync runs daily at midnight UTC.

### `next.config.mjs` — Security Headers

```javascript
const nextConfig = {
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    }];
  },
};
```

Applied globally to all routes. These are defense-in-depth headers — no client-side cross-origin fetches exist (all mutations use server actions with same-origin POST), but these headers protect against clickjacking and MIME-sniffing attacks.

### `.env.example` — Required Environment Variables

```
DATABASE_URL          — PgBouncer connection (pooled, port 6543)
DIRECT_URL            — Direct connection (migrations, port 5432)
DEFAULT_TENANT_SUBDOMAIN  — Fallback tenant (e.g., "snax")
NEXTAUTH_SECRET       — JWT signing secret
NEXTAUTH_URL          — App base URL
CRON_SECRET           — Bearer token for cron endpoint auth
NEXT_PUBLIC_SUPABASE_URL / ...ANON_KEY  — Client-side Supabase
SUPABASE_SERVICE_ROLE_KEY   — Server-side Supabase (admin writes)
INSTAGRAM_ACCESS_TOKEN      — Default platform token
YOUTUBE_API_KEY             — Default platform token
TWITCH_CLIENT_ID / SECRET   — Twitch OAuth credentials
VERCEL_API_TOKEN / VERCEL_PROJECT_ID  — Custom domain provisioning
TOKEN_ENCRYPTION_KEY        — AES-256-GCM key for OAuth tokens
```

## Middleware — Domain Resolution

`src/middleware.ts`

The middleware is the **entry point for every request**. It handles three domain types:

| Domain pattern | Example | Behavior |
|---------------|---------|----------|
| Platform domain | `influencer-space-alpha.vercel.app` | Serves marketing pages (no rewrite) |
| Subdomain | `snax.influencer-space-alpha.vercel.app` | Extracts subdomain, rewrites to `/[subdomain]/...` |
| Custom domain | `myinfluencer.com` | Rewrites to `/[myinfluencer.com]/...` |

### `parseTenantHost(host)` Logic

```typescript
function parseTenantHost(host: string): string | null {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  const stripped = hostname.replace(/^www\./, "");

  // 1. Is this a platform domain? → marketing page
  if (platformDomains.some(d => d === host.toLowerCase())) return null;

  // 2. Is this a subdomain of a platform domain? → extract tenant
  for (const domain of platformDomains) {
    if (stripped.endsWith(`.${domain}`)) {
      return stripped.slice(0, -(domain.length + 1));
    }
  }

  // 3. Otherwise → treat as custom domain
  return stripped;
}
```

The resolved `tenantHost` is injected as the `x-tenant-host` header and passed to every downstream component.

### Admin Auth Guard

For `/admin/*` and `/super-admin/*` routes (except `/admin/login`):

```typescript
const token = await getToken({ req: request, secret });
if (!token) {
  return NextResponse.redirect(new URL("/admin/login", request.url));
}
```

This ensures no unauthenticated user reaches the admin panel.

## Cron Job: Social Stats & Content Sync

`src/app/api/cron/sync-socials/route.ts`

### Authentication

```typescript
const authHeader = request.headers.get("authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Batch Processing

The cron processes tenants in batches to stay within Vercel function time limits:

```typescript
const BATCH_SIZE = 5;
const tenants = await prisma.tenant.findMany({
  take: BATCH_SIZE,
  orderBy: { updatedAt: "asc" }, // least recently synced first
});

const hasMore = await prisma.tenant.count() > BATCH_SIZE;
```

If there are more than 5 tenants, the response includes `hasMore: true` — Vercel's cron scheduler will invoke the function again on the next tick (within the same schedule window).

### Per-Platform Sync

For each tenant, the worker fetches data from three platforms:

| Platform | Stats Endpoint | Content Endpoint | Auth |
|----------|---------------|------------------|------|
| **YouTube** | `youtube.channels.list(id, statistics)` | `youtube.search.list(channelId, type=video, maxResults=10)` | `youtubeApiKey` (plaintext tenant key) |
| **Instagram** | `instagram.me?fields=followers_count,media_count` | `instagram.me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink` | `instagramAccessToken` (encrypted) → decrypt → use; fallback to `instagramApiKey` |
| **Twitch** | `twitch.users(id)` → `twitch.streams(userId)` | `twitch.clips(broadcaster_id, first=10)` | `twitchAccessToken` (encrypted) → decrypt → use; if expired, `refreshToken()` → re-encrypt → store new token |

### Content Item Upsert

Each synced post is upserted into `ContentFeedItem`:

```typescript
await prisma.contentFeedItem.upsert({
  where: { tenantId_externalId: { tenantId, externalId: post.id } },
  create: { tenantId, platform, mediaType, url, thumbnailUrl, caption, permalink, externalId: post.id, syncedAt: new Date() },
  update: { url, thumbnailUrl, caption, syncedAt: new Date() },
});
```

The composite unique constraint `@@unique([tenantId, externalId])` means re-syncing the same post updates existing rows rather than creating duplicates.

### Stats Upsert

```typescript
await prisma.socialStats.upsert({
  where: { tenantId_platform: { tenantId, platform } },
  create: { tenantId, platform, followers, views, posts },
  update: { followers, views, posts },
});
```

Uses `@@unique([tenantId, platform])` for idempotent upserts.

## Token Encryption

`src/lib/crypto.ts`

OAuth tokens (Instagram and Twitch) are encrypted at rest using AES-256-GCM:

```typescript
const algorithm = "aes-256-gcm";
const key = Buffer.from(TOKEN_ENCRYPTION_KEY, "hex");

function encrypt(plaintext: string): string { ... }
function decrypt(ciphertext: string): string { ... }
```

- **Encryption:** 32-byte random IV, authentication tag included. Format: `iv:authTag:ciphertext` (hex-encoded).
- **Decryption:** Extracts IV and tag, verifies authentication, returns plaintext.
- **Use:** Cron worker decrypts tokens before API calls, re-encrypts refreshed tokens before storing.

## Vercel Domain API Integration

`src/services/vercel.service.ts` + `src/actions/domain.actions.ts`

Required environment:
- `VERCEL_API_TOKEN` — Vercel personal access token (generate in Vercel Dashboard → Settings → Tokens)
- `VERCEL_PROJECT_ID` — Project ID from Vercel Dashboard (format: `prj_xxxxxxxxxxxx`)

The Vercel API provides wildcard SSL automatically for any domain added through the API. No manual SSL configuration needed.

### Full Domain Attachment Flow

```
1. Admin enters "shop.myinfluencer.com" in DomainSettings UI
2. attachCustomDomain action:
   a. VercelService.addDomain("shop.myinfluencer.com")
      → POST /v10/projects/{id}/domains
      → Returns verification records:
        [{ type: "CNAME", domain: "shop.myinfluencer.com", value: "cname.vercel-dns.com" }]
   b. prisma.tenant.update({ customDomain: "shop.myinfluencer.com" })
   c. logAction(tenantId, "attachCustomDomain", { domain })
3. UI shows DNS records:
   ┌─────────────────────────────────┐
   │ CNAME  shop.myinfluencer.com   │
   │        cname.vercel-dns.com    │
   └─────────────────────────────────┘
4. Admin adds CNAME record at their registrar (Namecheap, GoDaddy, Cloudflare)
5. Admin clicks "Verify":
   a. VercelService.verifyDomain(domain)
      → POST /v9/projects/{id}/domains/{domain}/verify
      → Then GET status → verified: true/false
   b. logAction(tenantId, "verifyDomain", { verified })
6. Middleware picks up customDomain → public page routes to tenant
```

## File Storage

`src/lib/supabase.ts` + `src/services/storage.service.ts`

- **Bucket:** `influencer-images` (public)
- **Path pattern:** `{tenantId}/{folder}/{timestamp}-{random}.{ext}`
- **Policies:** SELECT (everyone), INSERT (anon — needed for client-side uploads), UPDATE/DELETE (owner only)
- **Max file size:** 50MB (enforced client-side in ImageUploader)
- **Allowed types:** JPEG, PNG, WebP, GIF, SVG (for images) + MP4, WebM, QuickTime (for videos)

The `StorageService` class requires `SUPABASE_SERVICE_ROLE_KEY` for server-side write operations (used by `affiliate.actions.ts` for programmatic file deletion during affiliate cleanup).

## Response Format

All API routes return consistent top-level JSON:

```json
{ "ok": true, "processed": 5, "results": [...], "hasMore": true }
```

Errors are never thrown — the cron worker catches individual tenant/platform failures and continues processing the next one. This prevents one faulty API key from blocking all other tenants' syncs.
