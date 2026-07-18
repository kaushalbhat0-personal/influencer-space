# 02 — Database Schema

## Overview

PostgreSQL (via Prisma) with UUID primary keys, JSONB for settings, and `CASCADE` deletes from the central `Tenant` table. All tenant-scoped tables are indexed on `tenantId`.

## Entity Relationship Diagram (Simplified)

```
WebsiteAgency (1) ───< AgencyTenant (N) >─── Tenant (1)
       │                                            │
       ├── (1) ─── AgencySubscription (1)           ├── (1) ─── Subscription (1)
       └── (1) ───< User (N)                        └── (1) ───< User (N)
                                                             └── (1) ───< Product (N)
                                                                        └── (1) ───< ProductOrder (N)
```

## Full Schema

### `Tenant` — Central tenant table

```
Tenant
├── id                    UUID PK
├── name                  String
├── subdomain             String @unique        ← e.g., "snax"
├── customDomain          String?               ← e.g., "myinfluencer.com"
├── razorpayAccountId     String? @unique
├── razorpaySetupComplete Boolean @default(false)
├── youtubeChannelId      String?
├── twitchChannelId       String?
├── youtubeApiKey         String?               ← plaintext, per-tenant
├── instagramApiKey       String?               ← plaintext, per-tenant
├── instagramAccessToken  String? @db.Text      ← AES-256-GCM encrypted
├── instagramRefreshToken String? @db.Text
├── instagramTokenExpiry  DateTime?
├── twitchAccessToken     String? @db.Text      ← AES-256-GCM encrypted
├── twitchRefreshToken    String? @db.Text
├── twitchTokenExpiry     DateTime?
├── createdAt             DateTime
└── updatedAt             DateTime @updatedAt
```

**Key design decisions:**
- OAuth tokens (Instagram/Twitch) are stored in the tenant row, not a separate table. This keeps tenant data co-located and avoids extra joins on token refresh.
- Tokens marked `@db.Text` because encrypted strings can exceed the default 255-char limit.
- `razorpayAccountId` is unique — one Razorpay linked account per tenant.

### `User` — Admin users

```
User
├── id        UUID PK
├── tenantId  UUID? FK → Tenant   ← NULL for SUPER_ADMIN
├── name      String?
├── email     String
├── password  String               ← bcrypt hash
├── role      Role @default(ADMIN)
├── createdAt DateTime
└── updatedAt DateTime @updatedAt

@@unique([tenantId, email])  ← one user per email per tenant
@@index([tenantId])
```

**Roles:** `SUPER_ADMIN` (platform admin, `tenantId = null`) and `ADMIN` (tenant-specific).

### `Subscription`

```
Subscription
├── id                     UUID PK
├── tenantId               UUID FK → Tenant @unique
├── razorpaySubscriptionId String?
├── status                 String @default("FREE")   ← FREE | PRO | ENTERPRISE
├── plan                   String @default("STARTER")
├── currentPeriodEnd       DateTime?
├── createdAt / updatedAt
```

1:1 with Tenant via unique `tenantId`. Cascade on tenant delete.

### `Setting` — Key-value JSON store

```
Setting
├── id        UUID PK
├── tenantId  UUID FK → Tenant
├── key       String        ← e.g., "hero_data", "influencer_data"
├── value     Json          ← JSONB column
└── updatedAt DateTime @updatedAt

@@unique([tenantId, key])   ← one setting per key per tenant
@@index([tenantId])
```

Allows flexible schema-less configuration. The `patchHeroData` atomic upsert merges into the JSONB without a read-modify-write cycle.

### `Product`

```
Product
├── id          UUID PK
├── tenantId    UUID FK
├── name        String
├── description String?
├── price       Float                    ← INR amount
├── imageUrl    String?                  ← Supabase public URL
├── order       Int @default(0)
├── isActive    Boolean @default(true)   ← admin toggle for visibility
├── createdAt / updatedAt
@@index([tenantId])
```

### `ProductOrder` — Razorpay checkout tracking

```
ProductOrder
├── id                String PK (cuid)
├── tenantId          UUID FK
├── productId         UUID FK
├── amount            Float
├── status            String @default("PENDING")
├── razorpayOrderId   String @unique
├── razorpayPaymentId String?
├── fanEmail          String?
├── createdAt / updatedAt
@@index([tenantId, productId])
```

### `AffiliateLink`

```
AffiliateLink
├── id        UUID PK
├── tenantId  UUID FK
├── title     String
├── url       String
├── imageUrl  String?
├── order     Int @default(0)
├── clicks    Int @default(0)    ← incremented on click
├── isActive  Boolean @default(true)
├── createdAt / updatedAt
@@index([tenantId])
```

### `GalleryImage`

```
GalleryImage
├── id          UUID PK
├── tenantId    UUID FK
├── title       String
├── description String?
├── imageUrl    String                ← always populated
├── mediaType   String @default("image")  ← "image" | "video"
├── videoUrl    String?               ← populated when mediaType = "video"
├── category    String @default("bgmi")
├── order       Int @default(0)
├── isActive    Boolean @default(true)
├── createdAt / updatedAt
@@index([tenantId])
```

### `TimelineEvent`

```
TimelineEvent
├── id          UUID PK
├── tenantId    UUID FK
├── year        String      ← e.g., "2026"
├── title       String
├── description String
├── imageUrl    String?
├── stats       String?     ← e.g., "100K Subscribers"
├── order       Int @default(0)
├── isActive    Boolean @default(true)
├── createdAt / updatedAt
@@index([tenantId])
```

### `Game`

```
Game
├── id          UUID PK
├── tenantId    UUID FK
├── name        String
├── logoUrl     String?
├── description String?
├── genre       String?
├── order       Int @default(0)
├── isActive    Boolean @default(true)
├── createdAt / updatedAt
@@index([tenantId])
```

### `SocialStats`

```
SocialStats
├── id        UUID PK
├── tenantId  UUID FK
├── platform  String        ← "instagram" | "youtube" | "twitch"
├── followers Int @default(0)
├── views     Int @default(0)
├── posts     Int @default(0)
└── updatedAt DateTime @updatedAt

@@unique([tenantId, platform])  ← one row per platform per tenant
@@index([tenantId])
```

Crudely cached social statistics. Upserted by the cron worker on each sync run.

### `AuditLog`

```
AuditLog
├── id        UUID PK
├── tenantId  UUID FK
├── action    String       ← e.g., "createProduct", "updateHeroData"
├── metadata  Json @default("{}")  ← JSONB
└── createdAt DateTime @default(now())

@@index([tenantId, createdAt])
```

Immutable audit trail. Every mutation in every server action writes a row. Sensitive metadata keys (token, secret, password) are auto-redacted by the `sanitizeMetadata` utility before storage.

The index on `[tenantId, createdAt]` enables efficient paginated queries for "view recent activity" features.

### `ContentFeedItem`

```
ContentFeedItem
├── id           UUID PK
├── tenantId     UUID FK
├── platform     String       ← "instagram" | "youtube" | "twitch"
├── mediaType    String       ← "image" | "video"
├── url          String @db.Text
├── thumbnailUrl String? @db.Text
├── caption      String? @db.Text
├── permalink    String? @db.Text
├── pinned       Boolean @default(false)   ← admin-pinned items shown first
├── hidden       Boolean @default(false)   ← admin-hides from public feed
├── externalId   String?                   ← platform's native post ID
├── order        Int @default(0)
├── syncedAt     DateTime @default(now())
├── createdAt / updatedAt

@@unique([tenantId, externalId])  ← prevents duplicates on re-sync
@@index([tenantId, pinned, hidden, order])
```

Auto-populated by the cron sync worker. The unique constraint on `[tenantId, externalId]` ensures idempotent upserts — re-syncing the same post won't create a duplicate row.

The composite index on `[tenantId, pinned, hidden, order]` supports the query pattern:
```sql
SELECT * FROM "ContentFeedItem"
WHERE "tenantId" = $1 AND "hidden" = false
ORDER BY "pinned" DESC, "order" ASC, "createdAt" DESC
```

## Index Strategy

| Table | Index | Purpose |
|-------|-------|---------|
| All tenant tables | `@@index([tenantId])` | Foreign key lookups (Prisma auto-creates FK indexes) |
| `User` | `@@unique([tenantId, email])` | Login lookup + uniqueness |
| `Setting` | `@@unique([tenantId, key])` | Key-based upsert (`ON CONFLICT`) |
| `SocialStats` | `@@unique([tenantId, platform])` | Per-platform upsert |
| `ContentFeedItem` | `@@unique([tenantId, externalId])` | Dedup on re-sync |
| `ContentFeedItem` | `@@index([tenantId, pinned, hidden, order])` | Public feed query optimization |
| `AuditLog` | `@@index([tenantId, createdAt])` | Recent activity queries |
