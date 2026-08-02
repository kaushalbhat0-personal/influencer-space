import type { VersionedPromptRegistry } from "../prompt-registry";
import { Generator as HeroGenerator } from "./hero";
import { Generator as SEOGenerator } from "./seo";
import { Generator as BrandingGenerator } from "./branding";
import { Generator as ProductsGenerator } from "./products";
import { Generator as CTAGenerator } from "./cta";
import { Generator as FAQGenerator } from "./faq";

export function registerPromptDefinitions(registry: VersionedPromptRegistry): void {
  const generators = [
    new HeroGenerator(),
    new SEOGenerator(),
    new BrandingGenerator(),
    new ProductsGenerator(),
    new CTAGenerator(),
    new FAQGenerator(),
  ];

  for (const gen of generators) {
    for (const template of gen.generate()) {
      registry.register(template);
    }
  }
}
