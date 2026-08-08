# Marketing Contact & Navigation Polish

**Track:** RCCF-LAUNCH-POLISH-05
**Status:** Implemented

Small launch-polish items for the marketing site. No redesign, no runtime
changes, no new pages, no new components beyond reuse of the existing
marketing chrome.

## Canonical contact (Phase 1 + 2)

The ONLY public contact address is:

```
info.micronest@gmail.com
```

Defined once in `src/lib/marketing/messaging.ts` (`CONTACT_EMAIL`) and reused by
every surface so nothing can drift.

### Audit result — what existed and what changed

| Location | Before | After |
| --- | --- | --- |
| `/contact` | `support@influencerspace.in` + WhatsApp `+91-98765-43210` (placeholder) | `info.micronest@gmail.com`; WhatsApp/phone block removed |
| Footer (`src/components/marketing/Footer.tsx`) | `support@influencerspace.in` | `info.micronest@gmail.com` via `CONTACT_EMAIL` |
| `/terms` §11 Contact | `support@influencerspace.in` | `info.micronest@gmail.com` |
| `/refund` (3 places) | `support@influencerspace.in` | `info.micronest@gmail.com` |
| `/privacy` §7 + §8 Grievance Officer | `privacy@influencerspace.in`, `grievance@influencerspace.in` | `info.micronest@gmail.com` |
| `src/lib/marketing/messaging.ts` `BRAND.email` | `support@influencerspace.in` | `info.micronest@gmail.com` |
| `SECURITY.md` | `support@influencerspace.in` | `info.micronest@gmail.com` |

**Excluded by design (business logic, not marketing contact):** creator profile
`phone` fields, bookings/fulfillment `customerPhone`, the creator hero social-link
types (`whatsapp`, `phone`), knowledge-runtime `contact.phone` scoring, and
payment providers (PhonePe). These are product features for creators — not the
marketing contact surface.

## Contact page (Phase 3)

- Shows the canonical email as a `mailto:` link.
- Support copy: "We usually respond within one business day."
- WhatsApp + phone placeholder removed. Nothing implies phone support.
- Contact form + Quick Links retained.

## Footer (Phase 4)

The footer now uses `CONTACT_EMAIL` everywhere. The footer is rendered on:
Homepage, About, Features, Pricing, FAQ, Contact, Privacy, Terms, Refund,
Showcase (newly added) and Blog (newly added) — identical everywhere.

## Navigation polish (Phase 5)

Every standalone marketing page now uses the shared `MarketingNav` + `Footer`
(chrome that previously existed on Home/About/Features/Pricing/FAQ but was
missing from Contact, Privacy, Terms, Refund and Showcase). The nav logo links
home and the nav exposes every top-level section, so users are never trapped.

## Showcase (Phase 6)

- Added `MarketingNav` (back to Home/Showcase) + `Footer`.
- Verified: cards link to real published storefronts (external), category/search
  pills are internal links, no broken screenshot/asset references. The marketing
  screenshot assets (`public/marketing-assets/storefront/*.png`) exist and match.

## SEO (Phase 7)

- Organization JSON-LD on the homepage now includes `email: info.micronest@gmail.com`.
- Added per-page `metadata` (title/description/canonical) to `/contact`, `/privacy`,
  `/terms`, `/refund`, `/showcase`.
- Footer contact links are `mailto:` to the canonical address on every page.

## Regression (Phase 8)

- `tsc --noEmit`, `npm run lint`, `npm run build`, and the full vitest suite
  (2066 tests) pass.
- New Playwright spec `tests/e2e/public/marketing-contact.spec.ts` verifies the
  canonical email on all marketing surfaces, no phone/WhatsApp leftovers, back
  navigation on legal pages, and the Organization-schema email. It runs as part
  of the `public` Playwright project when the e2e harness (server + seeded DB)
  is up.
