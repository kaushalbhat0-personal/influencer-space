# PRD-003: Storefront Runtime

**Status:** Implemented (Phase 7)
**Version:** 1.0

## Problem Statement

Every generated creator website must render as a production-quality storefront. It must be fast, SEO-friendly, accessible, and composable — regardless of which sections the creator has enabled.

## User Personas

- **Visitor / Fan:** Visits a creator's website to browse products, view content, and make purchases
- **Search Engine:** Crawls the site for indexing, structured data, and ranking

## User Stories

- As a visitor, I want to see the creator's profile, products, gallery, and links on one page
- As a visitor, I want the page to load fast on mobile
- As a search engine, I want structured data (JSON-LD) for the creator profile and products
- As a creator, I want my website to look branded with my colors and typography

## Functional Requirements

1. Dynamic routing: `/{subdomain}` or `/{customDomain}` resolves to tenant storefront
2. Section registry: pluggable section system (hero, links, products, timeline, gallery, content-feed, footer)
3. Theme injection via CSS custom properties (--accent, --primary, --secondary)
4. SEO metadata: title, description, OG, Twitter cards, canonical URL, robots.txt, sitemap.xml
5. JSON-LD structured data: Person schema (profile) + ItemList schema (products)
6. Suspense boundaries per section for streaming server rendering
7. Custom 404 page for missing tenants
8. Preview mode: `?preview=true` shows draft changes

## Non-Functional Requirements

- Lighthouse performance score > 90
- First Contentful Paint < 1.5s
- WCAG AA accessible
- Sitemap regenerates every hour (ISR)

## Acceptance Criteria

- [ ] Visiting a valid subdomain renders the creator's storefront with all enabled sections
- [ ] `robots.txt` allows crawling and points to `sitemap.xml`
- [ ] JSON-LD validates in Google's Rich Results Test
- [ ] Custom 404 renders for nonexistent tenants
- [ ] OG image appears when sharing link on social media

## Success Metrics

- Storefront availability > 99.9%
- Crawl rate: all tenant pages indexed within 7 days
- Bounce rate < 50%

## Risks

- Custom domain SSL depends on Vercel — delays if Vercel is down
- `public.service.ts` is a single orchestrator for all section data — may become a bottleneck
- No CDN edge caching for dynamic content

## Out of Scope

- Multi-page storefronts (blog, product detail pages)
- A/B testing of layouts
- Analytics integration (Phase 4+)
