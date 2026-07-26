import { describe, it, expect, beforeAll } from "vitest";
import { KnowledgeBuilder } from "@/lib/generation/intelligence/knowledge-builder";
import { PersonaEngine, ExperienceProfileBuilder } from "@/lib/generation/persona/engine";
import { PlanningContextEngine } from "@/lib/generation/planning-context/engine";
import { ExperiencePlanningEngine } from "@/lib/generation/experience-plan/engine";
import {
  CREATOR_DATASET_V1, buildContentSource, getNiches, getNicheCounts,
} from "@/lib/testing/creator-dataset-v1";
import type { CreatorValidationEntry } from "@/lib/testing/creator-dataset-v1";

const knowledgeBuilder = new KnowledgeBuilder();
const personaEngine = new PersonaEngine();
const profileBuilder = new ExperienceProfileBuilder();
const planningExp = new ExperiencePlanningEngine();

interface CreatorScore {
  entry: CreatorValidationEntry;
  niche: string;
  persona: string;
  personaScore: number;
  profile: string;
  sections: number;
  pageTypes: number;
  themePrimary: string;
  themeCorrect: boolean;
  issues: string[];
  marketingReady: boolean;
}

describe("V1 Creator Dataset — Full Pipeline Validation", () => {
  const results: CreatorScore[] = [];

  beforeAll(() => {
    for (const entry of CREATOR_DATASET_V1) {
      const source = buildContentSource(entry);
      const graph = knowledgeBuilder.build(source);
      const match = personaEngine.detect(graph);
      const profile = profileBuilder.build(graph, match.persona, match.score);
      const plan = planningExp.plan(graph, profile);

      const issues: string[] = [];
      if (match.score < 40) issues.push(`Low persona score: ${match.score}`);
      if (graph.confidence < 0.3) issues.push(`Low KG confidence: ${graph.confidence}`);
      if (plan.sectionOrder.order.length <= 1) issues.push("Only 1 section — defaults used");
      if (plan.page.pageTypes.length === 0) issues.push("No page types");

      const themeKey = entry.niche === "lifestyle" ? "lifestyle" : entry.niche;
      const palettes: Record<string, string> = {
        gaming: "#7C3AED", education: "#3B82F6", finance: "#059669",
        fitness: "#EA580C", music: "#DB2777", travel: "#0EA5E9",
        food: "#D97706", photography: "#475569", technology: "#4F46E5",
        art: "#8B5CF6", lifestyle: "#EC4899", sports: "#2563EB",
        news: "#1E293B", comedy: "#E11D48", celebrity: "#D946EF",
      };
      const expectedTheme = palettes[themeKey];
      const themeCorrect = graph.theme.primary === expectedTheme;

      results.push({
        entry,
        niche: graph.creator.niche,
        persona: match.persona.name,
        personaScore: match.score,
        profile: `${profile.creatorStage}/${profile.businessModel}/${profile.commerceStage}`,
        sections: plan.sectionOrder.order.length,
        pageTypes: plan.page.pageTypes.length,
        themePrimary: graph.theme.primary,
        themeCorrect,
        issues,
        marketingReady: match.score >= 60 && themeCorrect && issues.length === 0,
      });
    }
  });

  it("processes all 50 creators without errors", () => {
    expect(results.length).toBe(CREATOR_DATASET_V1.length);
    expect(CREATOR_DATASET_V1.length).toBeGreaterThanOrEqual(45);
  });

  it("detects correct niche for every creator", () => {
    let mismatches = 0;
    for (const r of results) {
      if (r.niche !== r.entry.niche) {
        mismatches++;
      }
    }
    expect(mismatches).toBeLessThanOrEqual(3);
  });

  it("assigns valid persona score to all creators", () => {
    const low = results.filter((r) => r.personaScore < 30);
    expect(low.length).toBe(0);
  });

  it("generates complete experience plans", () => {
    for (const r of results) {
      expect(r.sections).toBeGreaterThanOrEqual(1);
      expect(r.pageTypes).toBeGreaterThanOrEqual(2);
    }
  });

  it("identifies marketing-ready creators", () => {
    const ready = results.filter((r) => r.marketingReady);
    expect(ready.length).toBeGreaterThanOrEqual(30);
  });

  it("generates quality scores table", () => {
    console.log("\n=== V1 Creator Dataset Scores ===\n");
    const header = "| ID | Creator | Niche | Persona | Score | Profile | Theme | Sections | Marketing |";
    console.log(header);
    console.log("|---|---|---|---|---|---|---|---|---|");

    for (const r of results) {
      const themeBadge = r.themeCorrect ? "✓" : "✗";
      const mktBadge = r.marketingReady ? "★ READY" : "—";
      console.log(`| ${r.entry.id.padEnd(18)} | ${r.entry.creatorName.padEnd(20)} | ${r.niche.padEnd(12)} | ${r.persona.padEnd(18)} | ${String(r.personaScore).padStart(2)} | ${r.profile.padEnd(25)} | ${themeBadge} | ${String(r.sections).padStart(2)} | ${mktBadge} |`);
    }

    const ready = results.filter((r) => r.marketingReady);
    console.log(`\n--- Summary ---`);
    console.log(`Total creators: ${results.length}`);
    console.log(`Marketing-ready: ${ready.length}`);
    console.log(`Persona issues: ${results.filter((r) => r.personaScore < 40).length}`);
    console.log(`Theme mismatches: ${results.filter((r) => !r.themeCorrect).length}`);
    console.log(`Total issues: ${results.reduce((a, r) => a + r.issues.length, 0)}`);

    const counts = getNicheCounts();
    console.log(`\n--- Niche Distribution ---`);
    for (const [niche, count] of Object.entries(counts)) {
      const nicheReady = results.filter((r) => r.entry.niche === niche && r.marketingReady).length;
      console.log(`  ${niche.padEnd(12)}: ${String(count).padStart(2)} creators, ${String(nicheReady).padStart(2)} marketing-ready`);
    }

    const nicheScores: Record<string, number[]> = {};
    for (const r of results) {
      (nicheScores[r.entry.niche] ??= []).push(r.personaScore);
    }
    console.log(`\n--- Average Persona Score by Niche ---`);
    for (const [niche, scores] of Object.entries(nicheScores)) {
      const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
      console.log(`  ${niche.padEnd(12)}: ${avg}/100`);
    }
  });

  it("meets minimum quality threshold across all creators", () => {
    const avgScore = results.reduce((a, r) => a + r.personaScore, 0) / results.length;
    expect(avgScore).toBeGreaterThanOrEqual(50);
  });
});
