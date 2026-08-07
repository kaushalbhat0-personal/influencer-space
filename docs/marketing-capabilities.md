# Marketing Capabilities — RCCF-IMPLEMENTATION-70

## Principle

> Every marketing highlight MUST map directly to a real implemented capability.
> If a feature is shown publicly, it must exist. Marketing never invents
> features; the capability catalog + registry are the only sources.

## Capability inventory (real, implemented)

**Website & Builder:** AI-powered website generation · basic/advanced builder ·
basic/premium themes · navigation editor · template library · mobile-responsive
storefront · custom components · experience backgrounds (theme experience).

**Commerce:** products · services · courses · bookings · orders · Razorpay
checkout · gallery · testimonials · FAQs · timeline · links · content feed ·
games · affiliate links.

**Domains & brand:** CreatorStore subdomain · custom domain (+SSL) · custom
branding · remove branding · white label.

**AI & analytics:** AI content generation · AI credits · knowledge runtime ·
goals runtime · recommendations · business health · experience intelligence ·
website evolution · analytics (basic/advanced) · SEO tools.

**Developer & automation:** API access · webhooks · API integrations ·
automation · bulk publish · multiple users/team members.

**Agency & partner:** agency dashboard · client management · workspace
management · multi-client management · recurring commission · partner analytics.

**Support & platform:** priority support · community support · SSL · export.

## How highlights are expressed

Each plan's `marketingHighlights` is a curated, value-focused list derived from
the modules above. A unit test (`tests/unit/commerce-registry.test.ts`) enforces
that every highlight token matches a known capability keyword — so a highlight
cannot reference a feature that does not exist.

### Creator Launch (free trial)
AI-powered website generation · beautiful creator website · CreatorStore
subdomain · basic themes · 3 products/services/gallery items/testimonials/FAQs/
timeline entries/links/feed posts · mobile responsive · community support.

### Creator Growth (₹699, Most Popular)
Unlimited products · unlimited gallery · unlimited services · premium themes ·
full visual builder · advanced experience backgrounds · custom domain · AI
credits · analytics · SEO optimization · premium components · priority support.

### Creator Scale (₹1,999, Best Value)
Everything in Growth + API access · webhooks · automation · team members ·
advanced analytics · higher AI credits · increased storage · faster AI
generation queue · advanced commerce · CRM integrations.

### Partner Launch (free trial)
Agency dashboard · client management · workspace management · white-label
capabilities · community support.

### Solo Partner (₹2,999, Recommended)
Agency dashboard · client management · workspace management · recurring
commission · team members · partner analytics · premium themes · custom domain ·
priority support.

### Partner Scale (₹7,999, Best Value)
Everything in Solo + white label · multi-client management · bulk operations ·
API access · automation · advanced analytics · higher commission rates ·
priority support.

### Enterprise (Contact Sales — Enterprise Solutions only)
Unlimited everything · custom integrations · dedicated support · SLA · SSO +
audit logs.

## Comparison table

Generated automatically by `comparison.tsx` from `FEATURE_CATALOG` (labels,
groups, value types) + `entitlement.limit`/`has` (per-plan values). Available /
Unavailable / Limited / Unlimited are derived — nothing is hand-maintained.
