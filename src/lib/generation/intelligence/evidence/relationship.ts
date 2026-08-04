/**
 * Relationship Intelligence — IMPLEMENTATION-37.
 *
 * A lightweight, deterministic knowledge graph that links raw evidence tokens
 * to entities, niches, brands and sponsorship signals — no LLM calls. It sits
 * between Evidence Intelligence and Recommendations:
 *
 *   Football → Sports → Athlete
 *   FIFA → Football
 *   UEFA → Football
 *   Cristiano Ronaldo → Portugal → Nike → Sponsorship
 *
 * The graph reinforces entity disambiguation and drives monetization +
 * integration recommendations in the Website Blueprint.
 */
import type { EvidenceItem } from "./types";
import type { EvidenceEntityType } from "./config";

export interface KnowledgeNode {
  id: string;
  kind: "token" | "entity" | "niche" | "brand" | "person" | "federation" | "league" | "platform";
  label: string;
}

export interface KnowledgeEdge {
  from: string;
  to: string;
  relation: string;
  weight: number;
}

export interface RelationshipGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  chains: string[];
  /** Detected brands / sponsors (drives sponsorship monetization + integrations). */
  brands: string[];
  /** Detected platforms (drives integration recommendations). */
  platforms: string[];
  /** Entities strongly reinforced by the graph. */
  reinforcedEntities: Array<{ entity: EvidenceEntityType; strength: number }>;
  /** Niches reinforced by the graph. */
  reinforcedNiches: string[];
  evidenceCount: number;
}

interface RelationshipRule {
  /** Canonical label for the token (e.g. "FIFA"). */
  label: string;
  kind: "federation" | "league" | "brand" | "person" | "platform";
  entity?: EvidenceEntityType;
  niche?: string;
  brand?: string;
  platform?: string;
  /** Human-readable chain. */
  chain: string;
}

const RELATIONSHIP_RULES: Record<string, RelationshipRule> = {
  // Football / athlete chains
  fifa: { label: "FIFA", kind: "federation", entity: "athlete", niche: "sports", chain: "FIFA → Football → Sports → Athlete" },
  uefa: { label: "UEFA", kind: "federation", entity: "athlete", niche: "sports", chain: "UEFA → Football → Sports → Athlete" },
  "champions league": { label: "Champions League", kind: "league", entity: "athlete", niche: "sports", chain: "Champions League → Football → Sports → Athlete" },
  "premier league": { label: "Premier League", kind: "league", entity: "athlete", niche: "sports", chain: "Premier League → Football → Sports → Athlete" },
  "world cup": { label: "World Cup", kind: "league", entity: "athlete", niche: "sports", chain: "World Cup → Football → Sports → Athlete" },
  nba: { label: "NBA", kind: "league", entity: "athlete", niche: "sports", chain: "NBA → Basketball → Sports → Athlete" },
  cricket: { label: "Cricket", kind: "league", entity: "athlete", niche: "sports", chain: "Cricket → Sports → Athlete" },
  "real madrid": { label: "Real Madrid", kind: "league", entity: "athlete", niche: "sports", chain: "Real Madrid → Football → Sports → Athlete" },
  barcelona: { label: "Barcelona", kind: "league", entity: "athlete", niche: "sports", chain: "Barcelona → Football → Sports → Athlete" },
  // Sports brands → sponsorship
  nike: { label: "Nike", kind: "brand", entity: "athlete", niche: "sports", brand: "Nike", chain: "Nike → Sponsorship" },
  adidas: { label: "Adidas", kind: "brand", entity: "athlete", niche: "sports", brand: "Adidas", chain: "Adidas → Sponsorship" },
  puma: { label: "Puma", kind: "brand", entity: "athlete", niche: "sports", brand: "Puma", chain: "Puma → Sponsorship" },
  // Developer platforms
  github: { label: "GitHub", kind: "platform", entity: "developer", niche: "programming", platform: "github", chain: "GitHub → Developer → Open Source" },
  "open source": { label: "Open Source", kind: "platform", entity: "developer", niche: "programming", chain: "Open Source → Developer" },
  stackoverflow: { label: "Stack Overflow", kind: "platform", entity: "developer", niche: "programming", platform: "stackoverflow", chain: "Stack Overflow → Developer" },
  // Content platforms → integrations
  youtube: { label: "YouTube", kind: "platform", entity: "creator", niche: "entertainment", platform: "youtube", chain: "YouTube → Creator → Content" },
  instagram: { label: "Instagram", kind: "platform", entity: "influencer", niche: "lifestyle", platform: "instagram", chain: "Instagram → Influencer → Brand" },
  spotify: { label: "Spotify", kind: "platform", entity: "musician", niche: "music", platform: "spotify", chain: "Spotify → Music → Musician" },
  discord: { label: "Discord", kind: "platform", entity: "creator", niche: "community", platform: "discord", chain: "Discord → Community" },
  twitch: { label: "Twitch", kind: "platform", entity: "streamer", niche: "gaming", platform: "twitch", chain: "Twitch → Streamer → Gaming" },
  calendly: { label: "Calendly", kind: "platform", entity: "coach", niche: "business", platform: "calendly", chain: "Calendly → Booking" },
  linkedin: { label: "LinkedIn", kind: "platform", entity: "consultant", niche: "business", platform: "linkedin", chain: "LinkedIn → Business" },
  notion: { label: "Notion", kind: "platform", entity: "creator", niche: "productivity", platform: "notion", chain: "Notion → Productivity" },
  telegram: { label: "Telegram", kind: "platform", entity: "creator", niche: "community", platform: "telegram", chain: "Telegram → Community" },
  "google maps": { label: "Google Maps", kind: "platform", entity: "restaurant", niche: "food", platform: "google_maps", chain: "Google Maps → Local → Restaurant" },
  // People
  ronaldo: { label: "Cristiano Ronaldo", kind: "person", entity: "athlete", niche: "sports", chain: "Cristiano Ronaldo → Portugal → Nike → Sponsorship" },
  messi: { label: "Lionel Messi", kind: "person", entity: "athlete", niche: "sports", chain: "Lionel Messi → Football → Sponsorship" },
  portugal: { label: "Portugal", kind: "person", entity: "athlete", niche: "sports", chain: "Portugal → Football → Athlete" },
  // Education
  "khan academy": { label: "Khan Academy", kind: "platform", entity: "educator", niche: "education", platform: "khan_academy", chain: "Khan Academy → Education → Educator" },
};

/**
 * Build the relationship graph from the available text. Pure and deterministic.
 */
export function buildRelationshipGraph(sourceText: string, contentTexts: string[] = []): RelationshipGraph {
  const text = [sourceText, ...contentTexts].join(" ").toLowerCase();
  const nodes = new Map<string, KnowledgeNode>();
  const edges: KnowledgeEdge[] = [];
  const chains = new Set<string>();
  const brands = new Set<string>();
  const platforms = new Set<string>();
  const entityStrength = new Map<string, number>();
  const nicheSet = new Set<string>();

  for (const [token, rule] of Object.entries(RELATIONSHIP_RULES)) {
    if (!text.includes(token)) continue;
    nodes.set(rule.label, { id: rule.label, kind: rule.kind, label: rule.label });
    if (rule.brand) {
      nodes.set(rule.brand, { id: rule.brand, kind: "brand", label: rule.brand });
      edges.push({ from: rule.label, to: rule.brand, relation: "sponsors", weight: 1 });
      brands.add(rule.brand);
    }
    if (rule.platform) {
      platforms.add(rule.platform);
    }
    if (rule.entity) {
      entityStrength.set(rule.entity, (entityStrength.get(rule.entity) ?? 0) + 1);
    }
    if (rule.niche) {
      nicheSet.add(rule.niche);
      edges.push({ from: rule.label, to: rule.niche, relation: "belongs_to", weight: 0.8 });
    }
    chains.add(rule.chain);
  }

  return {
    nodes: Array.from(nodes.values()),
    edges,
    chains: Array.from(chains),
    brands: Array.from(brands),
    platforms: Array.from(platforms),
    reinforcedEntities: Array.from(entityStrength.entries()).map(([entity, strength]) => ({
      entity: entity as EvidenceEntityType,
      strength,
    })),
    reinforcedNiches: Array.from(nicheSet),
    evidenceCount: chains.size,
  };
}

/** Strongest graph-reinforced entity (disambiguation helper). */
export function strongestReinforcedEntity(graph: RelationshipGraph): EvidenceEntityType | null {
  if (graph.reinforcedEntities.length === 0) return null;
  return graph.reinforcedEntities.sort((a, b) => b.strength - a.strength)[0]!.entity;
}
