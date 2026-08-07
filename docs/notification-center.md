# Notification Center — RCCF-TRACK-02

## Creator / Agency / Super Admin centers

Every user has a runtime-backed Notification Center:

- **Bell** (`RuntimeNotificationBell`) — unread badge (polled), recent list,
  mark-all-read, opens on click (auto-marks read).
- **Full page** (`/admin/notifications`) — list, category filter, search,
  pagination, unread highlight, mark-read / archive / delete per item,
  mark-all-read, and a **preferences** panel.
- **Super Admin** — `/super-admin/communication` Communication Center
  (delivery observability + retry).

## Notification model

`Notification`: audience (creator/agency/super_admin), recipientId
(tenantId/agencyId/"system"), category, title, body, priority (low/medium/high),
channel, data, readAt, archivedAt, createdAt. Server-driven, tenant-scoped.

## Preferences (Phase 7)

Per-category channel control for **Email / In-app / Both / None** across the
canonical categories: commerce, orders, payments, builder, website,
recommendations, business_health, billing, security, marketing,
customer_success, system. Future: SMS / WhatsApp / Push.

Preference-aware delivery: `sendNotification` skips categories set to `none`.

## Security

Recipients resolve from the session (creator tenant, agency id, or "system" for
super admin) — users can only read/archive/delete their own notifications.
