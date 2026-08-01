# Network Diff

**IMPLEMENTATION-18 · Phase 9 · 2026-08-01**

## Claim

Compare localhost vs production request-by-request and highlight every
difference that explains the divergence.

## Authenticated storefront navigation

| Request | Local | Production |
|---|---|---|
| `GET /test-creator-1` | 200, full content | 200, empty content (same headers) |
| `GET /test-creator-1` RSC payload | sections with populated `resolvedData` | sections with `resolvedData: []` |
| `POST /builder` `loadBuilderPages` | 12 sections | 12 sections (same DB) |
| `POST /builder` `getBuilderOverview` | success | **`Cannot convert undefined or null to object`** |
| `POST /builder` `getLivePreviewData` (aggregate) | success | **`Invalid … uuid: ""`** |
| `POST /api/auth/callback/credentials` | 200 → dashboard | 200 → dashboard (login works) |

## Header comparison (storefront)

| Header | Local | Production |
|---|---|---|
| `Cache-Control` | `no-store` | `no-store` |
| `X-Matched-Path` | `/[domain]` | `/[domain]` |
| `x-middleware-rewrite` | none | none |
| Page chunk | `page-e88659a8149c2714.js` | `page-a39ff2a98380bd96.js` |

## The only meaningful differences

1. **Page chunk hash** differs → different deployed code.
2. **Server-action payloads differ** → production returns the aggregate error and
   the overview error; local returns data.
3. **Storefront RSC payload content differs** → production sends empty
   `resolvedData`; local sends the DB content.

## Auth / RSC prefetch noise (non-causal, documented)

Production console logged `Failed to fetch RSC payload for … Falling back to
browser navigation` for a few admin links. This is a prefetch fallback (the RSC
prefetch for protected routes resolves to a redirect) and does not affect the
storefront or the aggregate. It is a degraded-experience observation, not the
divergence cause.

## Verdict

Networking, cookies, CSRF, middleware and cache headers behave the same. The
only differences are **which code is deployed** and, consequently, the
**server-action / RSC payloads** the browser receives.
