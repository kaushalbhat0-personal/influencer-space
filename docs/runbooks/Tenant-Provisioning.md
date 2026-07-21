# Runbook: Tenant Provisioning

**Last updated:** July 2026
**Owner:** Platform Engineering

## Overview

Tenants are created in three ways:
1. **Super Admin Provision** — `/super-admin` → ProvisionTrigger → creates tenant + admin user
2. **AI Generation** — AI flow generates website → provisions tenant automatically
3. **Self-Service** (future) — Signup page creates tenant on registration

## Provisioning Flow

```
1. Create Tenant record (name, subdomain)
2. Create User record (email, hashed password, role=ADMIN, tenantId)
3. Create Subscription record (plan=STARTER)
4. Create Settings records (hero, influencer data defaults)
5. Generate subdomain: name → lowercase → alphanumeric+dash → creatorspace.app
```

## Admin Account

- Default password: `CreatorLaunch2026!`
- Email: provided during provision (Super Admin sets it)
- Role: `ADMIN`
- Dashboard: `https://{subdomain}.creatorspace.app/admin`

## Manual Provision (Script)
```ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const password = await bcrypt.hash("password", 10);

const tenant = await prisma.tenant.create({
  data: {
    name: "Creator Name",
    subdomain: "creator-name",
  },
});

await prisma.user.create({
  data: {
    tenantId: tenant.id,
    email: "admin@example.com",
    password,
    role: "ADMIN",
  },
});
```

## Troubleshooting

### "Tenant ID is missing"
- User session doesn't have `tenantId` claim
- Check NextAuth JWT callback is storing `tenantId`
- Verify user has `tenantId` in database

### "Subdomain already taken"
- Subdomains must be unique across platform
- Use `toSubdomain()` helper for sanitization
- Check `prisma.tenant.findUnique({ where: { subdomain } })`

### Provisioning Hangs
- Check `prisma seed` completes without errors
- Verify database connection: `DATABASE_URL` is valid
- Check Supabase pool for connection limits
