import type { KnowledgeGraph } from "./types";

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  score: number;
}

export class KnowledgeValidator {
  validate(graph: KnowledgeGraph): ValidationResult {
    const issues: string[] = [];

    if (!graph.creator.name || graph.creator.name.trim().length === 0) {
      issues.push("Creator name is missing");
    }

    if (!graph.creator.niche || graph.creator.niche === "unknown") {
      issues.push("Niche could not be determined");
    }

    if (graph.products.length === 0) {
      issues.push("No product recommendations generated");
    }

    if (graph.sections.length === 0) {
      issues.push("No section recommendations generated");
    }

    if (graph.socialLinks.length === 0) {
      issues.push("No social links extracted");
    }

    if (!graph.theme.primary || !graph.theme.secondary) {
      issues.push("Theme colors could not be determined");
    }

    const lowConfidenceFields = this.getLowConfidenceFields(graph);
    for (const field of lowConfidenceFields) {
      issues.push(`Low confidence in ${field}`);
    }

    const score = this.calculateScore(graph, issues.length);

    return {
      valid: issues.length < 3,
      issues,
      score,
    };
  }

  private getLowConfidenceFields(graph: KnowledgeGraph): string[] {
    const fields: Array<{ name: string; confidence: number }> = [
      { name: "creator", confidence: graph.creator.confidence },
      { name: "brand", confidence: graph.brand.confidence },
      { name: "audience", confidence: graph.audience.confidence },
      { name: "content", confidence: graph.content.confidence },
      { name: "seo", confidence: graph.seo.confidence },
      { name: "theme", confidence: graph.theme.confidence },
      { name: "businessModel", confidence: graph.businessModel.confidence },
    ];

    return fields
      .filter((f) => f.confidence < 0.4)
      .map((f) => f.name);
  }

  private calculateScore(graph: KnowledgeGraph, issueCount: number): number {
    const baseScore = graph.confidence * 0.4;
    const completenessScore = this.calculateCompleteness(graph) * 0.3;
    const penaltyScore = Math.max(0, 1 - issueCount * 0.1);

    return Math.round(Math.min(baseScore + completenessScore + penaltyScore, 1) * 100) / 100;
  }

  private calculateCompleteness(graph: KnowledgeGraph): number {
    let filled = 0;
    let total = 0;

    const checks: Array<() => boolean> = [
      () => !!graph.creator.name,
      () => !!graph.creator.niche,
      () => graph.products.length > 0,
      () => graph.sections.length > 0,
      () => graph.socialLinks.length > 0,
      () => !!graph.theme.primary,
      () => !!graph.seo.pageTitle,
      () => graph.seo.keywords.length > 0,
      () => !!graph.brand.name,
      () => !!graph.audience.ageRange,
    ];

    for (const check of checks) {
      total++;
      if (check()) filled++;
    }

    return total > 0 ? filled / total : 0;
  }
}
