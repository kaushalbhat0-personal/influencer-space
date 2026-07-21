# Runbook: Database Migrations

**Last updated:** July 2026
**Owner:** Backend Engineering

## Schema Location
`prisma/schema.prisma`

## Migration Flow

### 1. Develop
```bash
# Create migration
npx prisma migrate dev --name add-<feature>
```

### 2. Verify
```bash
npx prisma generate
npx tsc --noEmit
npm run test
```

### 3. Deploy (production)
```bash
# Apply all pending migrations
npx prisma migrate deploy

# Verify
npx prisma db pull --print | diff - prisma/schema.prisma
```

### 4. Seed (development only)
```bash
npx prisma db seed
```

## Rollback

```bash
# List migrations
npx prisma migrate status

# Create rollback migration manually
npx prisma migrate dev --name rollback-<feature>

# Or in production, apply a reset migration
npx prisma migrate deploy
```

## Key Models
- **Tenant** — Creator website identity
- **Product** — Creator store products
- **ProductOrder** — Customer purchases
- **Subscription** — Billing plans
- **WebsiteAgency** — Agency accounts
- **User** — Auth users (roles: SUPER_ADMIN, AGENCY_ADMIN, AGENCY_STAFF, ADMIN)

## Constraints
- `ProductOrder.razorpayOrderId` must be unique
- `Setting` unique on `(tenantId, key)`
- `Subscription.tenantId` unique (one sub per tenant)
- Run `npx prisma migrate deploy` as part of every production deploy
