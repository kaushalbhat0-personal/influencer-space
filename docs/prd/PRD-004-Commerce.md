# PRD-004: Commerce Workspace

**Status:** Implemented (Phase 4)
**Version:** 1.0

## Problem Statement

Creators need to manage products, track orders, analyze revenue, and understand their customers. They need a commerce workspace that replaces spreadsheets and manual tracking.

## User Personas

- **Creator:** Manages their own store — adds products, fulfills orders, views revenue
- **Customer:** Purchases products from the creator's storefront

## User Stories

- As a Creator, I want to see my total orders, revenue, and active products at a glance
- As a Creator, I want to search, sort, and filter my orders by status
- As a Creator, I want to see which customers have spent the most
- As a Creator, I want to track which products are performing best
- As a Customer, I want to browse products and checkout with UPI

## Functional Requirements

1. Orders page: searchable, sortable, paginated data table with status badges (PENDING/PAID/COMPLETED/FAILED)
2. Customers page: aggregated from fanEmail across orders (total spent, order count, last order)
3. Analytics page: KPIs (total orders, revenue, active products, conversion rate), top products
4. Products management: grid with CRUD, bulk actions, categories, pricing
5. Razorpay checkout integration via server actions
6. Payment webhook processing for order status updates

## Non-Functional Requirements

- Order list loads < 2 seconds (up to 200 orders)
- Customer aggregation is server-side (no client-side processing of large datasets)
- Revenue figures are accurate to paisa (decimal handling)

## Acceptance Criteria

- [ ] Orders table shows all orders with sortable columns and status badges
- [ ] Customers table aggregates unique emails with correct total spent
- [ ] Dashboard KPI cards show live counts from database
- [ ] Clicking a product row navigates to product detail

## Success Metrics

- Orders processed: 100% through Razorpay webhook
- Customer aggregation accuracy: 100% match with raw order data
- Page load time: < 2s for all commerce pages

## Risks

- No refund processing in admin UI (requires Razorpay dashboard)
- No inventory tracking per product variant
- No multi-currency support (INR only)

## Out of Scope

- Physical product shipping integration
- Tax calculation (GST)
- Abandoned cart recovery
- Discount codes / coupons
