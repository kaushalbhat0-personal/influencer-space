import type { BusinessProfile } from "@/lib/acquisition/business-types";
import type { BusinessHealthScore } from "../domain/types";

export function calculateHealth(business: BusinessProfile): BusinessHealthScore {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const criticalWarnings: string[] = [];
  const suggestions: string[] = [];

  // Brand completeness (25%)
  let brandScore = 0;
  if (business.businessName.trim().length >= 2) { brandScore += 8; strengths.push("Business name is set"); }
  else { weaknesses.push("Business name missing or too short"); }
  if (business.ownerName.trim().length >= 2) brandScore += 5;
  if (business.tagline.trim().length >= 10) { brandScore += 7; strengths.push("Descriptive tagline"); }
  else if (business.tagline.trim().length > 0) brandScore += 3;
  else { suggestions.push("Add a tagline to help customers understand your business quickly"); }
  if (business.category) brandScore += 5;
  const brandCompleteness = Math.min(Math.round((brandScore / 25) * 100), 100);

  // Visual completeness (20%)
  let visualScore = 0;
  if (business.logoUrl) { visualScore += 10; strengths.push("Logo uploaded"); }
  else { suggestions.push("Upload a logo for better brand recognition"); }
  if (business.palette.primary !== "#6366f1") visualScore += 5;
  else { suggestions.push("Customize brand colors to stand out"); }
  if (business.palette.secondary !== "#a78bfa") visualScore += 5;
  const visualCompleteness = Math.min(Math.round((visualScore / 20) * 100), 100);

  // Offer completeness (25%)
  let offerScore = 0;
  if (business.offers.length > 0) {
    offerScore += 5;
    strengths.push(`${business.offers.length} offer(s) configured`);
    const namedCount = business.offers.filter((o) => o.name.trim().length > 0).length;
    offerScore += Math.min(namedCount * 5, 10);
    const pricedCount = business.offers.filter((o) => o.price > 0).length;
    offerScore += Math.min(pricedCount * 5, 10);
    if (business.offers.some((o) => o.price === 0)) {
      suggestions.push("Consider adding pricing to your free listings");
    }
  } else {
    criticalWarnings.push("No products or services configured — storefront will be empty");
    weaknesses.push("No offers added");
  }
  const offerCompleteness = Math.min(Math.round((offerScore / 25) * 100), 100);

  // SEO readiness (15%)
  let seoScore = 0;
  if (business.description.trim().length >= 50) { seoScore += 10; strengths.push("Detailed business description helps SEO"); }
  else if (business.description.trim().length >= 20) seoScore += 5;
  else { suggestions.push("Write a longer description (50+ characters recommended for SEO)"); }
  if (business.audience.trim().length > 0) { seoScore += 5; strengths.push("Target audience defined"); }
  else { suggestions.push("Define your target audience for better engagement"); }
  const seoReadiness = Math.min(Math.round((seoScore / 15) * 100), 100);

  // Conversion readiness (15%)
  let conversionScore = 0;
  if (business.socialLinks.length > 0) {
    conversionScore += 5;
    strengths.push(`${business.socialLinks.length} social link(s) connected`);
  } else { suggestions.push("Add social links to build trust with visitors"); }
  if (business.goals.trim().length > 0) conversionScore += 5;
  if (business.tone.trim().length > 0) { conversionScore += 5; strengths.push("Brand voice defined"); }
  else { suggestions.push("Define your brand voice for consistent messaging"); }

  // Storefront quality = average of all scores
  const storefrontQuality = Math.round((brandCompleteness + visualCompleteness + offerCompleteness + seoReadiness + conversionScore) / 5);

  // Overall completion
  const total = brandScore + visualScore + offerScore + seoScore + conversionScore;
  const overall = Math.min(Math.round((total / 100) * 100), 100);

  return {
    overall,
    completion: brandCompleteness,
    storefrontQuality,
    conversionScore,
    brandCompleteness,
    offerCompleteness,
    seoReadiness,
    strengths,
    weaknesses,
    criticalWarnings,
    suggestions,
  };
}
