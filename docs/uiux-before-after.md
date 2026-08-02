# UI/UX Before vs After — IMPLEMENTATION-19

## Hero layout (storefront + builder)

| Aspect | Before | After |
|---|---|---|
| Media | hidden when no video/poster (blank gradient) | **always renders first**: video → poster → styled placeholder |
| Avatar overlap | 18% / 12% | **30–40%** (`-mt-[30%] sm:-mt-[22%]`), avatar visibly bites into the media |
| Full-width | hero constrained inside `max-w-2xl` wrapper | **full-bleed** hero; every section owns its container |
| Hierarchy | media → avatar → badge → name → headline → tagline → bio → CTA → socials | same order, better rhythm, spacing per breakpoint |
| About section | a duplicate identity section below the hero | **removed entirely** |

## Hero settings (admin)

| Before | After |
|---|---|
| Hero Video / Hero Poster / Hero Background / Creator Identity / Hero Details (title+CTA+badge) / Social Links / API | **Hero Media** (video+poster+background+alignments) · **Creator Identity** (profile, name, headline, tagline, bio) · **Buttons** (CTA) · **Live Badge** · **Social Links** · **Developer APIs** |
| Save required per field | video/poster/profile uploads **auto-save** |
| No live identity preview | Live Preview shows profile picture, name, tagline, bio |

## Media Library

| Before | After |
|---|---|
| Statuses: `QUEUED`, `PENDING`, `PROCESSING`, "N refs" | **Uploading · Processing… · Ready · Used · Unused · Failed · Trashed** |
| Upload → spinner forever → refresh | **progress bar** → asset lands in grid as **Ready** |
| Video cards: plain thumbnail | ▶ overlay + **duration · resolution · size** |
| No usage story | **Used In** human labels ("Hero Video", "Product: X") as deep links |
| Delete button present even when referenced | Delete blocked + **Replace** offered |
| Detail: sparse | Detail: Name, Type, Size, Resolution, Duration, Provider, Status, Created, Last Updated |

## Screenshots (Playwright)
- `playwright-report/screenshots/j1-hero-media-first.png`
- `playwright-report/screenshots/j2-upload-progress.png`
- `playwright-report/screenshots/j2-storefront-video.png`
- `playwright-report/screenshots/j3-media-library.png`
- `playwright-report/screenshots/j4-used-in.png`
- `playwright-report/screenshots/j5-no-about.png`
- `playwright-report/screenshots/i3-hero-layout.png`
