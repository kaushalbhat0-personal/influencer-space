# PRD-001: AI Website Generation

**Status:** Implemented (Phase 2)
**Version:** 1.0

## Problem Statement

Creators spend weeks building websites. They need to configure themes, write copy, upload media, and structure pages manually. For non-technical creators, this is a barrier to having an online presence.

## User Personas

- **Super Admin:** Provisions websites for creators from YouTube/Instagram URLs
- **Agency Admin:** Generates white-label websites for multiple clients
- **Creator (future):** Self-service website generation from their own social profiles

## User Stories

- As a Super Admin, I want to paste a creator's YouTube URL and generate a complete website in under 2 minutes
- As a Super Admin, I want to choose how deeply AI analyzes and generates content (Fast/Balanced/Premium)
- As a Super Admin, I want to see a scored report of what was detected vs missing before approving
- As a Super Admin, I want to preview the generated website on mobile/tablet/desktop before deploying

## Functional Requirements

1. Source resolution from YouTube, Instagram, TikTok URLs and handles
2. Profile extraction (name, bio, avatar, social links, subscriber count)
3. Content extraction (latest posts, popular content, metadata)
4. AI content generation (hero copy, about section, CTA, SEO, section suggestions)
5. Theme selection based on creator niche (9 presets)
6. Website composition (hero, gallery, products, links, timeline)
7. Scoring (0-100) with detected/missing checklist
8. Section toggle before deployment
9. Deployment progress with stage-by-stage tracking

## Non-Functional Requirements

- Pipeline completes in < 3 minutes (Premium), < 1 minute (Balanced), < 30 seconds (Fast)
- Idempotent — running twice with same input produces same result
- Retry-safe — failed stages can be re-run
- Template-based defaults when external APIs are unavailable

## Acceptance Criteria

- [ ] Paste `@techcreator` → detects platform as YouTube → generates website
- [ ] Score ring animates from 0 to final value on report screen
- [ ] Deployment card shows live stage progress
- [ ] Section toggle persists choices across regenerations

## Success Metrics

- Generation success rate > 95%
- Average generation time < 90 seconds (Balanced)
- Creator satisfaction score > 4/5

## Risks

- Platform detection may fail for unusual URL formats
- Niche detection is keyword-based, not ML-based — may misclassify
- Content generation is template-based — no LLM integration yet

## Out of Scope

- Self-service generation for creators (Phase 2+)
- LLM-based content generation (future)
- Google Business Profile scraping
