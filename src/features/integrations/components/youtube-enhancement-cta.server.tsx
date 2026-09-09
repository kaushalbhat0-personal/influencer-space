import { requireTenant } from "@/lib/auth/require-tenant";
import { integrationService } from "@/features/integrations/service";
import { YouTubeEnhancementCta } from "./youtube-enhancement-cta";

// Server wrapper — reuses existing integrationService (no parallel flow, no new OAuth).
// Never blocks generation/publishing/storefront; graceful fallback on error.
// No YouTube data fetch, no fabrication, no arch changes.
export async function YouTubeEnhancementCtaServer() {
  try {
    const { tenantId } = await requireTenant();
    const integrations = await integrationService.list(tenantId);
    const youtube = integrations.find((i) => i.platform === "youtube");
    const isConnected = youtube?.status === "connected";
    return <YouTubeEnhancementCta isConnected={isConnected} />;
  } catch {
    // Graceful non-blocking: service unavailable -> show disconnected CTA (still useful, still links to integrations)
    return <YouTubeEnhancementCta isConnected={false} isUnavailable />;
  }
}
