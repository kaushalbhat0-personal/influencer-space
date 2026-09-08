import { describe, it, expect } from "vitest";
import { parseResume, isLikelyResume, extractResumeText, inferResumeName } from "@/lib/resume/extract";
import { profileAcquisitionEngine } from "@/lib/generation/acquisition/engine";
import { buildEvidenceIntelligence } from "@/lib/generation/intelligence/evidence/detect";
import fs from "fs";
import path from "path";

// Load Kaushal resume once
async function loadKaushalText(): Promise<string> {
  const pdfPath = path.resolve("public/marketing-assets/Resume/Kaushal_Bhat_Resume (2).pdf");
  if (!fs.existsSync(pdfPath)) return "";
  const { extractText } = await import("unpdf");
  const buf = fs.readFileSync(pdfPath);
  const r = await extractText(new Uint8Array(buf), { mergePages: true });
  return (r.text as string) || "";
}

describe("RCCF-PRELAUNCH-12A — Resume Semantic Intelligence", () => {
  it("extractResumeText: TXT extraction remains green", async () => {
    const buf = Buffer.from("Hello Resume Content\nLine 2", "utf-8");
    const txt = await extractResumeText(buf, "text/plain");
    expect(txt).toBe("Hello Resume Content\nLine 2");
  });

  it("extractResumeText: rejects empty buffer", async () => {
    await expect(extractResumeText(Buffer.from("", "utf-8"), "text/plain")).rejects.toThrow();
  });

  it("extractResumeText: caps at 12k", async () => {
    const long = "a".repeat(13000);
    const txt = await extractResumeText(Buffer.from(long, "utf-8"), "text/plain");
    expect(txt.length).toBe(12000);
  });

  it("inferResumeName: extracts first line as name", () => {
    expect(inferResumeName("Kaushal G Bhat\nFull-Stack Engineer", "fallback.pdf")).toBe("Kaushal G Bhat");
    expect(inferResumeName("hello@example.com\nOther", "fallback.pdf")).toBe("fallback");
  });

  it("isLikelyResume: false for ordinary free text", () => {
    expect(isLikelyResume("Hello")).toBe(false);
    expect(isLikelyResume("Hello world I am a creator who loves cooking and travel")).toBe(false);
    expect(isLikelyResume("This is just a long bio about lifestyle and fashion ".repeat(5))).toBe(false);
  });

  it("isLikelyResume: true for resume-like text", async () => {
    const kaushal = await loadKaushalText();
    if (!kaushal) return;
    expect(isLikelyResume(kaushal)).toBe(true);
    const synthetic =
      "PROFILE\nI am a software engineer\nTECHNICAL SKILLS\nLanguages: JS, TS\nPROJECTS\nMy Project — A cool app | JS\nDoes things\nWORK EXPERIENCE\nEngineer — Acme Corp Jan 2020 – Present\n● Did stuff\nEDUCATION\nBachelor — University (2015 – 2019)";
    expect(isLikelyResume(synthetic)).toBe(true);
  });

  it("parseResume: Kaushal → summary populated", async () => {
    const kaushal = await loadKaushalText();
    if (!kaushal) return;
    const p = parseResume(kaushal);
    expect(p.summary.length).toBeGreaterThan(50);
    expect(p.summary.toLowerCase()).toContain("full-stack");
  });

  it("parseResume: Kaushal → experience populated", async () => {
    const kaushal = await loadKaushalText();
    if (!kaushal) return;
    const p = parseResume(kaushal);
    expect(p.experience.length).toBeGreaterThanOrEqual(3);
    expect(p.experience[0].title).toBeTruthy();
    expect(p.experience[0].raw.length).toBeGreaterThan(20);
  });

  it("parseResume: Kaushal → skills populated", async () => {
    const kaushal = await loadKaushalText();
    if (!kaushal) return;
    const p = parseResume(kaushal);
    expect(p.skills.length).toBeGreaterThanOrEqual(10);
    expect(p.skills).toContain("TypeScript");
    expect(p.skills).toContain("Python");
  });

  it("parseResume: Kaushal → projects populated", async () => {
    const kaushal = await loadKaushalText();
    if (!kaushal) return;
    const p = parseResume(kaushal);
    expect(p.projects.length).toBeGreaterThanOrEqual(5);
    expect(p.projects.some((pr) => pr.name.toLowerCase().includes("creatos"))).toBe(true);
  });

  it("parseResume: Kaushal → education populated", async () => {
    const kaushal = await loadKaushalText();
    if (!kaushal) return;
    const p = parseResume(kaushal);
    expect(p.education.length).toBeGreaterThanOrEqual(2);
    expect(p.education[0].degree.toLowerCase()).toContain("bachelor");
    expect(p.education[0].raw).toBeTruthy();
  });

  it("parseResume: Kaushal → social links populated (github)", async () => {
    const kaushal = await loadKaushalText();
    if (!kaushal) return;
    const p = parseResume(kaushal);
    expect(p.socialLinks.length).toBeGreaterThanOrEqual(1);
    expect(p.socialLinks.some((l) => l.platform === "github" && l.url.includes("github.com"))).toBe(true);
  });

  it("parseResume: Kaushal → location populated", async () => {
    const kaushal = await loadKaushalText();
    if (!kaushal) return;
    const p = parseResume(kaushal);
    expect(p.location).toBe("Pune, India");
  });

  it("parseResume: preserves rawText", async () => {
    const kaushal = await loadKaushalText();
    if (!kaushal) return;
    const p = parseResume(kaushal);
    expect(p.rawText.length).toBeGreaterThan(1000);
    expect(p.rawText).toContain("KAUSHAL G BHAT");
  });

  it("parseResume: malformed/minimal resume does not invent fields", () => {
    const p = parseResume("Hello");
    expect(p.summary).toBe("");
    expect(p.experience.length).toBe(0);
    expect(p.skills.length).toBe(0);
    expect(p.projects.length).toBe(0);
    expect(p.education.length).toBe(0);
    expect(p.certifications.length).toBe(0);
    expect(p.socialLinks.length).toBe(0);
    expect(p.location).toBeNull();
  });

  it("parseResume: minimal resume with single heading does not invent extra sections", () => {
    const txt = "PROFILE\nJust a short bio about a software engineer with some experience in building apps and platforms for users\n";
    const p = parseResume(txt);
    expect(p.summary.length).toBeGreaterThan(0);
    expect(p.experience.length).toBe(0);
    expect(p.skills.length).toBe(0);
  });

  it("parseResume: does not create URLs from prose dots (React, Node)", () => {
    const txt = "PROFILE\nI love React 19, Next.js 16, Tailwind CSS v4\nTECHNICAL SKILLS\nLanguages: TypeScript, Python\nPROJECTS\nMy App — Cool | React\nDoes great stuff\nWORK EXPERIENCE\nEngineer — Acme Jan 2020 – Present\n● Built React apps\nEDUCATION\nBachelor — University (2015 – 2019)";
    const p = parseResume(txt);
    // Should have 0 socialLinks because no github/linkedin URLs present
    expect(p.socialLinks.length).toBe(0);
    // Skills should not contain URLs
    expect(p.skills.every((s) => !s.includes("http"))).toBe(true);
  });

  it("acquisition: ordinary free text remains ordinary (no resume, bio intact)", async () => {
    const free = "Hello world I am a creator who loves cooking and travel tips and making videos every day for my audience";
    const res = await profileAcquisitionEngine.acquire(free, "Test Creator");
    expect(res.source.resume).toBeUndefined();
    expect(res.source.bio).toContain("Hello world");
    expect(res.source.bio.length).toBeGreaterThan(20);
  });

  it("acquisition: resume produces ContentSource.resume and narrows bio", async () => {
    const kaushal = await loadKaushalText();
    if (!kaushal) return;
    const res = await profileAcquisitionEngine.acquire(kaushal, "Kaushal G Bhat");
    expect(res.source.resume).toBeDefined();
    expect(res.source.resume!.summary.length).toBeGreaterThan(30);
    expect(res.source.resume!.experience.length).toBeGreaterThan(0);
    expect(res.source.resume!.skills.length).toBeGreaterThan(0);
    expect(res.source.resume!.projects.length).toBeGreaterThan(0);
    expect(res.source.resume!.education.length).toBeGreaterThan(0);
    expect(res.source.resume!.location).toBe("Pune, India");
    // bio must NOT be the full 9k raw
    expect(res.source.bio.length).toBeLessThan(1200);
    expect(res.source.bio.length).toBeGreaterThan(30);
    // bio should be summary, not contain WORK EXPERIENCE heading dump
    expect(res.source.bio.toLowerCase()).not.toContain("work experience");
    // links should contain github
    expect(res.source.links.some((l) => l.includes("github.com"))).toBe(true);
    // diagnostics populatedFields includes resume
    expect(res.diagnostics.populatedFields).toContain("resume");
  });

  it("acquisition: resume does not invent links from prose", async () => {
    const txt =
      "PROFILE\nI am an engineer who loves Node.js and React 19\nTECHNICAL SKILLS\nLanguages: TypeScript, Python\nPROJECTS\nMy App — Cool | TypeScript\nGreat app\nWORK EXPERIENCE\nEngineer — Acme Jan 2020 – Present\n● Did stuff\nEDUCATION\nBachelor — University (2015 – 2019)";
    const res = await profileAcquisitionEngine.acquire(txt, "Test");
    // No github/linkedin in text, so no social links
    if (res.source.resume) {
      expect(res.source.resume.socialLinks.length).toBe(0);
    }
    expect(res.source.links.length).toBe(0);
  });

  it("evidence integration: resume signals reach evidence layer", async () => {
    const kaushal = await loadKaushalText();
    if (!kaushal) return;
    const res = await profileAcquisitionEngine.acquire(kaushal, "Kaushal G Bhat");
    const source = res.source;
    // Flatten like onboarding/service.ts does
    const resumeTexts: string[] = source.resume
      ? [
          source.resume.summary,
          ...source.resume.skills,
          ...source.resume.experience.map((e) => `${e.title} ${e.company ?? ""} ${e.description}`),
          ...source.resume.projects.map((p) => `${p.name} ${p.description}`),
          ...source.resume.education.map((e) => `${e.degree} ${e.institution ?? ""}`),
        ].filter(Boolean)
      : [];
    expect(resumeTexts.length).toBeGreaterThan(20);
    const intel = buildEvidenceIntelligence({
      sourceText: source.bio ?? "",
      sourceContentTexts: [...resumeTexts],
      followers: 0,
      acquisitionCompleteness: 0.7,
      graphNiche: null,
      graphConfidence: 0.5,
    });
    // Should have detected some evidence (at least niches/business)
    expect(intel.diagnostics.evidenceCount).toBeGreaterThan(0);
    // Resume tech signals should produce evidence (e.g., programming/tech)
    // Not asserting exact entity, just that intel built without crash and has confidence
    expect(intel.confidence.overall).toBeGreaterThan(0);
  });

  it("URL validation: resume prose with dots is not treated as URL (03D regression)", async () => {
    const resumeLike = "PROFILE\nI love React 19, Next.js 16\nTECHNICAL SKILLS\nLanguages: TypeScript\nPROJECTS\nMy App — Cool\nDesc\nWORK EXPERIENCE\nEngineer — Acme Jan 2020 – Present\n● Did stuff\nEDUCATION\nBachelor — Uni (2015 – 2019)";
    const res = await profileAcquisitionEngine.acquire(resumeLike, "Test");
    // Should not have created a link from "React 19" or "Next.js 16"
    expect(res.source.links.every((l) => l.includes("://"))).toBe(true); // any link must be a real URL
  });
});
