import { websiteHealthEngine } from "@/lib/platform/health/engine";

export interface ClientHealthReport {
  overallScore: number;
  websiteScore: number | null;
  publishingScore: number;
  contentScore: number;
  seoScore: number;
  domainScore: number;
}

export class ClientHealthEngine {
  async evaluate(tenantId: string): Promise<ClientHealthReport> {
    const websiteHealth = await websiteHealthEngine.evaluate(tenantId).catch(() => null);

    const websiteScore = websiteHealth?.overallScore ?? null;

    const publishingChecks = websiteHealth?.checks.filter((c) =>
      ["publishing"].includes(c.category)
    ) ?? [];
    const publishingScore = publishingChecks.length > 0
      ? Math.round(publishingChecks.reduce((s, c) => s + c.score, 0) / publishingChecks.length)
      : 0;

    const contentChecks = websiteHealth?.checks.filter((c) =>
      ["content", "store"].includes(c.category)
    ) ?? [];
    const contentScore = contentChecks.length > 0
      ? Math.round(contentChecks.reduce((s, c) => s + c.score, 0) / contentChecks.length)
      : 0;

    const seoChecks = websiteHealth?.checks.filter((c) => c.category === "marketing") ?? [];
    const seoScore = seoChecks.length > 0
      ? Math.round(seoChecks.reduce((s, c) => s + c.score, 0) / seoChecks.length)
      : 0;

    const domainChecks = websiteHealth?.checks.filter((c) => c.category === "platform") ?? [];
    const domainScore = domainChecks.length > 0
      ? Math.round(domainChecks.reduce((s, c) => s + c.score, 0) / domainChecks.length)
      : 0;

    const allScores = [publishingScore, contentScore, seoScore, domainScore].filter((s) => s > 0);
    const overallScore = allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : (websiteScore ?? 0);

    return {
      overallScore,
      websiteScore,
      publishingScore,
      contentScore,
      seoScore,
      domainScore,
    };
  }
}

export const clientHealthEngine = new ClientHealthEngine();
