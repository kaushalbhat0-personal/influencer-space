import type { BusinessProfile } from "./business-types";

export interface CompletenessScore {
  overall: number;
  sections: SectionScore[];
  missing: string[];
  warnings: string[];
}

interface SectionScore {
  label: string;
  score: number;
  max: number;
}

export function calculateCompleteness(profile: BusinessProfile): CompletenessScore {
  const sections: SectionScore[] = [];
  const missing: string[] = [];
  const warnings: string[] = [];

  // Identity (25%)
  let identityScore = 0;
  if (profile.businessName.trim().length >= 2) identityScore += 10;
  else missing.push("Business name");
  if (profile.ownerName.trim().length >= 2) identityScore += 5;
  else missing.push("Owner name");
  if (profile.category) identityScore += 5;
  else missing.push("Business category");
  if (profile.tagline.trim().length >= 10) identityScore += 5;
  else if (profile.tagline.trim().length > 0) identityScore += 2;
  else missing.push("Tagline");
  sections.push({ label: "Identity", score: identityScore, max: 25 });

  // Description (20%)
  let descScore = 0;
  if (profile.description.trim().length >= 50) descScore += 15;
  else if (profile.description.trim().length >= 20) descScore += 8;
  else if (profile.description.trim().length > 0) descScore += 3;
  else missing.push("Description");
  if (profile.audience.trim().length > 0) descScore += 5;
  else warnings.push("Add target audience for better engagement");
  sections.push({ label: "Description", score: descScore, max: 20 });

  // Offers (25%)
  let offerScore = 0;
  if (profile.offers.length > 0) {
    offerScore += 5;
    const namedOffers = profile.offers.filter((o) => o.name.trim().length > 0);
    offerScore += Math.min(namedOffers.length * 5, 15);
    const pricedOffers = profile.offers.filter((o) => o.price > 0);
    offerScore += Math.min(pricedOffers.length * 3, 5);
  } else {
    missing.push("Products or services");
  }
  sections.push({ label: "Offers", score: offerScore, max: 25 });

  // Branding (15%)
  let brandScore = 0;
  if (profile.logoUrl) brandScore += 7;
  else warnings.push("Add a logo for better brand recognition");
  if (profile.coverUrl) brandScore += 3;
  if (profile.palette.primary !== "#6366f1") brandScore += 3;
  else warnings.push("Customize brand colors");
  if (profile.tone) brandScore += 2;
  sections.push({ label: "Branding", score: brandScore, max: 15 });

  // Social Links (10%)
  let socialScore = 0;
  if (profile.socialLinks.length > 0) {
    socialScore += 3;
    socialScore += Math.min(profile.socialLinks.length * 2, 7);
  } else {
    warnings.push("Add social links to connect with your audience");
  }
  sections.push({ label: "Social Links", score: socialScore, max: 10 });

  // Goals (5%)
  let goalScore = 0;
  if (profile.goals.trim().length > 0) goalScore += 5;
  sections.push({ label: "Goals", score: goalScore, max: 5 });

  const totalScore = sections.reduce((sum, s) => sum + s.score, 0);
  const overall = Math.min(Math.round((totalScore / 100) * 100), 100);

  return { overall, sections, missing, warnings };
}
