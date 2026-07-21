# Runbook: AI Website Generation Pipeline

**Last updated:** July 2026
**Owner:** AI/ML Engineering

## Pipeline Stages

1. Source Resolution → URL → platform + identifier
2. Profile Extraction → platform → CreatorProfile
3. Content Extraction → platform → CreatorContent
4. AI Content Generation → profile + content → GeneratedContent
5. Theme Selection → niche → GeneratedTheme
6. Website Composition → all → WebsiteComposition
7. Tenant Provisioning → profile → TenantProvisioning
8. Finalization → save + publish

## Entry Points

### Server Action (UI)
```ts
import { generateWebsite } from "@/actions/generate-website.action";
const result = await generateWebsite({ source: "https://youtube.com/@creator", strategy: "balanced" });
```

### Direct Pipeline (Script)
```ts
import { websiteGenerationPipeline } from "@/lib/ai-generation/pipeline";
const result = await websiteGenerationPipeline.execute({ source: "https://youtube.com/@creator" });
```

## Provider Status

| Provider | Profile | Content | Notes |
|----------|---------|---------|-------|
| YouTube | ✅ | ✅ | Template-based extraction (no YT API key needed) |
| Instagram | ✅ | ✅ | Template-based extraction |
| Manual | ✅ | ✅ | Bare handle fallback |
| TikTok | ⚠️ | ⚠️ | URL detection only |
| Google Business | ⚠️ | ⚠️ | URL detection only |

## Adding a New Provider

1. Implement `ProfileProvider` interface in `src/lib/ai-generation/providers/`
2. Implement `ContentProvider` interface
3. Register in `src/lib/ai-generation/providers/index.ts`
4. Add URL patterns to `src/lib/ai-generation/source-resolver.ts`

## Troubleshooting

### Generation Fails at Source Resolution
- Check URL format is supported (YouTube, Instagram, TikTok, manual)
- For YT handles: `@handle` format or full URL
- Run `sourceResolver.resolve(url)` to debug

### Generation Produces Empty Content
- Check provider health: `provider.healthCheck()`
- Verify niche detection (uses keyword matching on handle)
- Generation uses template-based defaults — no external API dependency

### Tenant Not Provisioned
- Check `tenantProvisioner.provision()` result
- Verify `adminEmail` and `subdomain` options are valid
