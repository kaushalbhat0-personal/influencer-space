# Browser vs Database

**IMPLEMENTATION-18 · Phase 3 · 2026-08-01**

## Claim

Compare what the **browser renders** against the **shared production database**.

## Database truth (shared Supabase project `flhllvzzbtkfrcrajicq`, tenant `eee52d43-…-dab36119`)

| Module | DB rows | Status |
|---|---|---|
| Hero (Setting `hero_data`) | title `Farah Live kz8r`, tagline `Picture abhi baaki hai mere dost` | present |
| Products | `test` ₹650 (PUBLISHED, active), `test product 2` ₹852 (PUBLISHED, active) | present |
| Gallery | Studio Session, Behind The Scenes, Live Stream | present |
| Offerings | Gaming Content Masterclass, Streaming Setup Guide (course); 1:1 Brand Coaching, Content Review (coaching) — all `published` | present |
| Timeline | 2021 Channel Started, 2023 1M Subscribers, 2025 Store Launch | present |
| Games | BGMI, Valorant | present |
| Links | YouTube, Instagram, X / Twitter | present |
| Testimonials / FAQ (Setting) | 2 / 2 | present |
| Brand | name `Test Creator 1` | present |
| PublishSnapshot v6 (live) | `content.products.length = 0`, `content.identity.name = ""`, `layout.sections = 12` | content EMPTY |

## Browser truth (production `/test-creator-1`)

Rendered: `Add products in Dashboard`, `Add images to your gallery`, `Add your
services`, `Add your courses`, `Add testimonials from your fans`, `Add
frequently asked questions`, `Add milestones to your timeline`, `Add your
games`, `Add your social links`, `© — CreatorStore`.

None of the database content appears in the DOM.

## Mismatch

| Module | DB | Browser | Broken layer |
|---|---|---|---|
| Hero | present | empty | aggregate |
| Products | 2 | 0 | aggregate |
| Gallery | 3 | 0 | aggregate |
| Services/Courses | 4 | 0 | aggregate |
| Timeline | 3 | 0 | aggregate |
| Games | 2 | 0 | aggregate |
| Links | 3 | 0 | aggregate |
| Testimonials | 2 | 0 | aggregate |
| FAQ | 2 | 0 | aggregate |

Every module: **DB has data, browser shows nothing.** The database is intact;
the aggregate that maps DB → content is the broken layer.

## Proof the DB is the shared production database

- The production builder server action returned the exact 12-section layout that
  the local seed + E2E produced (including Products moved above About) — the
  same rows this audit reads.
- Production storage URLs reference the same Supabase project
  (`flhllvzzbtkfrcrajicq.supabase.co`).
