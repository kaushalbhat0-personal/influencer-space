import type { PromptTemplate } from "../types";

/**
 * creator-intelligence-enrichment prompt (IMPLEMENTATION-32).
 *
 * The prompt asks the model to ENRICH ONLY — never regenerate deterministic
 * facts. Input is a compact structured context of KNOWN data (no webpages, no
 * HTML, no browsing). Output is a strict JSON enrichment payload.
 */
export class CreatorIntelligenceEnrichmentGenerator {
  generate(): PromptTemplate[] {
    return [
      {
        id: "creator-intelligence-enrichment.v1",
        stage: "creator-intelligence-enrichment",
        version: "v1",
        system:
          "You are a Creator Intelligence Enrichment analyst. You receive a compact, structured " +
          "profile context that was already extracted deterministically. Your ONLY job is to fill " +
          "knowledge gaps and reason about the profile. Rules: " +
          "1. NEVER invent verified facts (follower counts, names, URLs, dates). " +
          "2. NEVER contradict provided deterministic values (niche, persona, category). " +
          "3. Only propose values for fields that are missing or uncertain in the context. " +
          "4. Output ONLY a valid JSON object matching the requested schema. " +
          "5. Keep reasoning concise. Be conservative and professional.",
        template:
          "Analyze this creator profile context and enrich the missing intelligence fields.\n\n" +
          "PROFILE CONTEXT\n" +
          "Platform: {{platform}}\n" +
          "Display name: {{displayName}}\n" +
          "Username: {{username}}\n" +
          "Biography: {{bio}}\n" +
          "Verified: {{verified}}\n" +
          "Followers: {{followers}}\n" +
          "Website: {{website}}\n" +
          "Keywords: {{keywords}}\n" +
          "Hashtags: {{hashtags}}\n" +
          "Languages: {{languages}}\n" +
          "Detected category: {{categories}}\n" +
          "Existing niche: {{niche}}\n" +
          "Existing persona: {{persona}}\n" +
          "Deterministic confidence: {{confidence}}\n" +
          "Known missing fields: {{missingFields}}\n" +
          "Acquisition capabilities: {{capabilities}}\n\n" +
          "Respond with ONLY JSON, schema:\n" +
          '{\n' +
          '  "entityType": "person|business|creator|athlete|musician|actor|developer|educator|coach|agency|brand|restaurant|hotel|retail|healthcare|non_profit|organization|community|other",\n' +
          '  "persona": "string | null",\n' +
          '  "industry": "string | null",\n' +
          '  "primaryNiche": "string | null",\n' +
          '  "secondaryNiches": ["string"],\n' +
          '  "audience": { "description": "string | null", "interests": ["string"] },\n' +
          '  "brandPosition": "string | null",\n' +
          '  "communicationStyle": "string | null",\n' +
          '  "visualStyle": "string | null",\n' +
          '  "contentStyle": "string | null",\n' +
          '  "businessModel": "string | null",\n' +
          '  "confidenceAdjustment": "number 0..1 (how confident you are in the enrichment; only meaningful when you added signal)",\n' +
          '  "recommendedTheme": "string | null",\n' +
          '  "recommendedSections": ["string"],\n' +
          '  "missingSignals": ["string"],\n' +
          '  "reasoningSummary": "string (1 sentence, factual)"\n' +
          "}",
        variables: [
          { name: "platform", type: "string", required: true, description: "Platform id" },
          { name: "displayName", type: "string", required: true, description: "Profile display name" },
          { name: "username", type: "string", required: true, description: "Profile handle" },
          { name: "bio", type: "string", required: true, description: "Profile biography" },
          { name: "verified", type: "boolean", required: true, description: "Verified status if known" },
          { name: "followers", type: "number", required: true, description: "Follower count if known" },
          { name: "website", type: "string", required: false, description: "Website hostname if known" },
          { name: "keywords", type: "string[]", required: false, description: "Extracted keywords" },
          { name: "hashtags", type: "string[]", required: false, description: "Extracted hashtags" },
          { name: "languages", type: "string[]", required: false, description: "Detected languages" },
          { name: "categories", type: "string[]", required: true, description: "Detected categories" },
          { name: "niche", type: "string", required: true, description: "Existing deterministic niche" },
          { name: "persona", type: "string", required: true, description: "Existing deterministic persona" },
          { name: "confidence", type: "number", required: true, description: "Deterministic confidence" },
          { name: "missingFields", type: "string[]", required: false, description: "Known missing fields" },
          { name: "capabilities", type: "string[]", required: false, description: "Acquisition capabilities" },
        ],
        responseFormat: "json_object",
        maxTokens: 700,
        temperature: 0.2,
        metadata: { schemaVersion: 1, costGuard: "single-call" },
      },
    ];
  }
}
