import type { LlmMessage } from "../providers/interface";

const VERSION = "v1.0.0";

const SYSTEM_PROMPT = `You are a Creator Intelligence Analyst for CreatorStore, a platform that helps creators build professional websites.

Your task is to analyze a creator's profile and produce structured intelligence that will drive website generation.

RULES:
- Output ONLY valid JSON. No markdown, no explanations.
- Follow the schema exactly.
- Be specific and actionable.
- Base analysis on the provided profile data.
- Never invent data not present in the profile.
- Confidence should reflect how much data was available (0.9+ for rich profiles, 0.5 for minimal).`;

function buildUserPrompt(profile: {
  name: string;
  description: string;
  followers: number;
  videoCount: number;
  viewCount: number;
  keywords: string[];
  platform: string;
  latestContent: { title: string; description: string }[];
}): string {
  return `Analyze this creator and produce website intelligence.

CREATOR PROFILE:
Name: ${profile.name}
Description: ${profile.description || "(no description)"}
Followers: ${profile.followers.toLocaleString()}
Videos: ${profile.videoCount.toLocaleString()}
Total Views: ${profile.viewCount.toLocaleString()}
Platform: ${profile.platform}
Keywords: ${profile.keywords.join(", ") || "(none)"}

LATEST CONTENT:
${profile.latestContent.slice(0, 5).map((c, i) => `${i + 1}. ${c.title} — ${c.description.slice(0, 100)}`).join("\n") || "(no content)"}

Produce structured intelligence in the following JSON format:
{
  "niche": "primary category",
  "subNiche": "more specific category or null",
  "audience": "target audience description or null",
  "brandPersonality": "brand personality description or null",
  "brandTone": "communication tone or null",
  "visualStyle": "recommended visual direction or null",
  "contentStyle": "content format/style or null",
  "websiteGoal": "primary website goal or null",
  "monetization": "how they monetize or null",
  "recommendedTheme": "one of: neon-dark, midnight-ocean, forest-canopy, royal-plum, slate-minimal, warm-ember",
  "recommendedTemplate": "one of: gaming, fitness, education, music, restaurant, portfolio, agency",
  "recommendedSections": ["ordered list of section IDs"],
  "seoKeywords": ["5-10 SEO keywords"],
  "suggestedCta": "primary call-to-action or null",
  "trustSignals": ["trust signals to feature"],
  "contentPillars": ["main content pillars"],
  "confidence": 0.0,
  "reasoning": "brief reasoning or null"
}`;
}

export function buildPrompt(profile: {
  name: string;
  description: string;
  followers: number;
  videoCount: number;
  viewCount: number;
  keywords: string[];
  platform: string;
  latestContent: { title: string; description: string }[];
}): { version: string; messages: LlmMessage[] } {
  return {
    version: VERSION,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(profile) },
    ],
  };
}
