# Pendallo

Pendallo is a professional home online — your website, showcase, links, and storefront in one place you own. Turn your presence into a business you own.

## What is Pendallo?

- Paste your YouTube, Instagram, TikTok, or any website link — Pendallo builds a complete storefront from your actual content (hero, products, navigation, checkout, SEO, social links).
- Customize in the visual Builder (drag sections, themes, real-time preview) and publish to a Pendallo subdomain or your own domain (custom domain with free SSL on Scale+).
- Sell via Razorpay (UPI, cards, net banking) — you keep 100% of every sale.
- Agencies: create and manage client websites at `/agency` → **New Client Website** (website, Google Business, social, business description, or resume).

## Quickstart

```bash
npm install
npm run dev
```

Open http://localhost:3000

- Marketing: `/` → **Start as Creator** or **Become a Partner** → `/signup`
- Individual: `/signup?persona=creator` → `/onboarding` → **Build My Storefront** → `/admin/dashboard` → **Open Builder** (`/builder`) → **Publish**
- Agency: `/signup?persona=partner` → `/agency` → **New Client Website** (`/agency/generate`) → invitations via `/claim-invite` → client dashboard
- Help: `/help` aggregates Getting Started, YouTube/Instagram, Payments, Builder path, FAQ, Agency How it works, and Contact
- Guides: `/blog/guides/getting-started`, `/blog/guides/connect-social-media` (live sync on Scale+), `/blog/guides/upi-payments`
- FAQ: `/faq` · Pricing: `/pricing` · Contact: `info.micronest@gmail.com`

## Recommended Builder Path

Edit content → Appearance (`/admin/appearance`) → Integrations (`/admin/integrations`, Resend optional) → SEO (`/admin/seo`) → Domain (`/admin/settings/domain`) → **Publish** in `/builder`.

Live/automatic YouTube & Instagram sync is available on Creator Scale and higher.

## Tech

Next.js 14 App Router · Prisma 7 · Supabase · NextAuth · Tailwind · Vercel. Workspace is the aggregate root for Creator and Agency.

See `docs/` for architecture decisions (engineering) and `/help` for user-facing guidance.
