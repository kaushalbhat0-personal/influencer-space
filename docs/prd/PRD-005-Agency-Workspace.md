# PRD-005: Agency Workspace

**Status:** Architecture designed, implementation pending
**Version:** 1.0

## Problem Statement

Agencies manage multiple creators. They need to provision websites, customize them, manage domains, and track performance across all clients — from one dashboard.

## User Personas

- **Agency Admin:** Manages the agency account, invites staff, provisions websites, manages billing
- **Agency Staff:** Edits client websites, views analytics, manages domains
- **Agency Client (Creator):** Receives a generated website, customizes it, publishes

## User Stories

- As an Agency Admin, I want to generate a website for a new client by pasting their YouTube URL
- As an Agency Admin, I want to see all my clients at a glance with their website status
- As an Agency Admin, I want to invite staff members with role-based permissions
- As an Agency Admin, I want to white-label the platform with my agency branding
- As Agency Staff, I want to edit a client's website and send them a preview
- As an Agency Admin, I want to see cross-client analytics (total revenue, top performers)

## Functional Requirements

1. Agency dashboard with KPI cards (clients, websites, revenue, staff)
2. Client list with search, sort, and status indicators
3. Client detail page with tabs (Overview, Website, Analytics, Billing, Settings)
4. AI generation flow for new clients (reuse from Super Admin)
5. Template library for agency-specific website templates
6. Team management with role-based permissions
7. White-label settings (branding, custom domain for agency portal)
8. Agency billing with per-client pricing

## Non-Functional Requirements

- Agency dashboard must support up to 500 clients per agency
- Client impersonation must be audited and logged
- Template application must complete in < 30 seconds
- Role-based access control for all agency endpoints

## Acceptance Criteria

- [ ] Agency can generate website for a new client using the AI flow
- [ ] Agency can view all clients and filter by status
- [ ] Client detail shows website preview with impersonation link
- [ ] Staff member cannot access billing or agency settings

## Success Metrics

- Agency retention: > 90% month-over-month
- Average clients per agency: > 5
- Client satisfaction score: > 4/5

## Risks

- Agency portal currently has no implemented sub-pages (skeleton only)
- No white-label CSS injection yet
- No per-client billing infrastructure

## Out of Scope

- Agency marketplace (discovery by creators)
- Revenue splitting automation
- Client communication portal (messaging)
