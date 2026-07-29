# Super Admin Vision

> **Part of:** [Creatos Platform Architecture v1](platform-architecture-v1.md)

---

## Purpose

The Super Admin workspace provides platform-wide operations, creator management, marketplace moderation, and system health monitoring. It is the operational control center for the Creatos platform.

**Status:** Planned for v1.1

---

## Principles

1. **Super Admin reuses all platform services** — No duplicate provisioning, publishing, or generation pipelines
2. **Super Admin adds new UI, not new architecture** — It builds on top of existing domains
3. **All Super Admin operations are audited** — Every action is logged
4. **Super Admin respects capability boundaries** — Agency and Enterprise features are gated by `CapabilityService`

---

## Workspace Sections

### 1. Creator Management

```
Creator List
├── Search / Filter (by plan, status, date)
├── Creator Detail
│   ├── Profile info, subscription, health
│   ├── Impersonate (login-as)
│   ├── Reset password
│   └── Suspend / Restore
└── Bulk Operations
    ├── Export CSV
    └── Apply plan changes
```

**Reuses:** `websiteHealthEngine`, `capabilityService`, auth system

### 2. Website Provisioning

```
Provision Dashboard
├── Analyze URL → Generate → Provision → Publish
├── Demo / Seed generation
├── Bulk provisioning (CSV upload)
└── Provision run history
```

**Reuses:** `ProvisioningService.provision()`, `PublishingService.publish()`, generation pipeline

### 3. Agency Management

```
Agency List
├── Agencies with client counts, revenue
├── Agency Detail
│   ├── Clients, team members, subscriptions
│   └── Impersonate agency admin
└── Plan management
```

**Reuses:** Existing workspace/team architecture

### 4. Marketplace Moderation

```
Themes
├── Approve / reject marketplace submissions
├── Set featured, premium, categories
└── Version management

Templates
├── Approve / reject template submissions
├── Set categories, compatibility
└── Version management
```

**Reuses:** `ThemeRegistry`, `BlueprintRegistry`, `MarketplaceRegistry`

### 5. Platform Analytics

```
Platform Dashboard
├── Total creators, agencies, websites
├── Revenue (MRR, ARR, by plan)
├── Growth trends
├── Active vs inactive creators
└── Geographic distribution
```

**New:** Dedicated analytics service (queries business DB + billing)

### 6. System Health

```
Health Dashboard
├── Database status, latency, connections
├── Storage usage, bandwidth
├── API health endpoints
├── Job runner status
└── Error rate monitoring
```

**Reuses:** API health route, monitoring infrastructure

### 7. Audit Log

```
Audit Trail
├── All platform operations
├── Filter by user, action, date range
├── Export
└── Retention policy management
```

**Reuses:** `auditLog` table, existing log infrastructure

### 8. Support Tools

```
Support Dashboard
├── Open tickets from contact submissions
├── Quick website stats lookup
├── Login-as creator
├── Manual publish / rollback
└── Feature flag override
```

---

## Architectural Constraints

| Operation | Must Use | Must NOT Use |
|-----------|----------|-------------|
| Create website | `ProvisioningService.provision()` | Direct DB writes |
| Publish website | `PublishingService.publish()` | Direct snapshot creation |
| Apply theme | `ThemeResolver` + theme update action | Direct DB write to Website table |
| Change plan | `CapabilityService` via billing | Hardcoded plan checks |
| Moderation | Update registry providers | DB writes to theme/template tables |

---

## UI Architecture

```
src/app/super-admin/
├── page.tsx                    ← Platform Dashboard
├── agencies/
├── analytics/
├── audit/
├── beta/
├── demo-library/
├── demo-publishing/
├── demo-studio/
├── domains/
├── events/
├── features/
├── feedback/
├── generate/
├── health/
├── imports/
├── invoices/
├── jobs/
├── operations/
├── payments/
├── revenue/
├── settings/
├── subscriptions/
├── support/
├── templates/
├── tenants/
├── themes/
├── themes-studio/
├── transactions/
├── users/
├── webhooks/
├── youtube-api/
└── _components/
    └── provision-modal.tsx     ← Reusable provisioning UI
```
