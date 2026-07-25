import type { ContentSource, ThemeIntelligence } from "./types";
import { NicheDetector } from "./niche-detector";
import { BrandExtractor } from "./brand-extractor";
import { THEME_PALETTES } from "./types";

export class ThemeSelector {
  constructor(
    private nicheDetector: NicheDetector,
    private brandExtractor: BrandExtractor,
  ) {}

  select(source: ContentSource): ThemeIntelligence {
    const niche = this.nicheDetector.detect(source);
    const brand = this.brandExtractor.extract(source);
    const palette = THEME_PALETTES[niche.niche] ?? THEME_PALETTES.default;

    const colors = brand.colors.length > 0 ? brand.colors : [];
    const primary = colors[0] ?? palette.primary;
    const secondary = colors[1] ?? palette.secondary;
    const accent = colors[2] ?? palette.accent;
    const mode = palette.mode;

    const hasBrandingOverride = brand.existingBranding && brand.colors.length > 0;

    return {
      palette: [primary, secondary, accent],
      primary,
      secondary,
      accent,
      mode: hasBrandingOverride ? "light" : mode,
      fontPairing: this.selectFontPairing(niche.niche),
      borderRadius: "0.5rem",
      confidence: hasBrandingOverride ? 0.9 : 0.7,
    };
  }

  private selectFontPairing(niche: string): string {
    const pairings: Record<string, string> = {
      gaming: "Inter + Orbitron",
      education: "Inter + Merriweather",
      finance: "Inter + Playfair Display",
      fitness: "Inter + Bebas Neue",
      music: "Inter + Poppins",
      travel: "Inter + Lora",
      food: "Inter + Cormorant Garamond",
      photography: "Inter + Montserrat",
      technology: "Inter + JetBrains Mono",
      art: "Inter + DM Serif Display",
      lifestyle: "Inter + Playfair Display",
      sports: "Inter + Bebas Neue",
      news: "Inter + Source Serif Pro",
    };
    return pairings[niche] ?? "Inter + System UI";
  }
}
