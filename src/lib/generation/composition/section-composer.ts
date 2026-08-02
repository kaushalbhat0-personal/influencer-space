import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { SectionBlueprint } from "./types";
import type { ExperiencePlan } from "@/lib/generation/experience-plan/types";
import { LayoutStrategyRegistry } from "./layouts/registry";
import { getVocabulary } from "@/lib/generation/content/vocabularies";

export class SectionComposer {
  private registry = new LayoutStrategyRegistry();

  compose(graph: KnowledgeGraph, plan: ExperiencePlan): SectionBlueprint[] {
    const niche = graph.creator.niche || "default";
    const variant = this.registry.selectVariant(niche, graph);
    const variantSections = variant.compose(graph);
    const hidden = new Set(plan.sectionOrder.hidden);
    const vocab = getVocabulary(niche);
    const name = graph.creator.name;
    const showPricing = plan.hero.showPricing;
    const showProof = plan.hero.showSocialProof;

    const visible = variantSections.filter((s) => !hidden.has(s.type));

    return visible.map((s) => {
      const enhanced = { ...s };
      if (s.type === "footer") {
        enhanced.props = { ...enhanced.props, copyright: `© ${new Date().getFullYear()} ${name}. All rights reserved.`, minimal: plan.footer.copyrightStyle === "minimal" };
      }
      if (s.type === "hero") {
        enhanced.props = {
          ...enhanced.props,
          showPricing,
          showSocialProof: showProof,
          alignment: plan.hero.headlineAlignment,
          ctaStyle: plan.cta.primaryStyle,
          overlay: plan.hero.overlay,
        };
      }
      if (s.type === "featured_products" || s.type === "product_grid") {
        enhanced.props = {
          ...enhanced.props,
          emptyMessage: vocab.products.emptyMessage,
          showPrice: plan.pricing.visibility !== "hidden",
          showRating: plan.socialProof.showRatings,
          badgeStyle: plan.pricing.badgeStyle,
        };
        if (!enhanced.props.title) enhanced.props.title = vocab.products.sectionTitle;
      }
      if (s.type === "gallery") {
        const galleryTitle = plan.gallery.titleStyle === "persona_name" ? `Portfolio — ${name}` : vocab.gallery.sectionTitle;
        enhanced.props = { ...enhanced.props, title: galleryTitle, layout: plan.gallery.layout, lightbox: plan.gallery.lightboxEnabled };
      }
      if (s.type === "contact_form") {
        enhanced.props = { ...enhanced.props, title: vocab.contact.sectionTitle, successMessage: vocab.contact.successMessage };
      }
      if (s.type === "faq") {
        enhanced.props = { ...enhanced.props, title: vocab.faq.sectionTitle, items: vocab.faq.items };
      }
      if (s.type === "social_links") {
        enhanced.props = { ...enhanced.props, title: "Follow " + name, style: plan.socialProof.socialLinksStyle };
      }
      if (s.type === "content_feed") {
        enhanced.props = { ...enhanced.props, emptyMessage: vocab.emptyState.noContent, density: plan.contentDensity };
      }
      if (s.type === "testimonials") {
        enhanced.props = { ...enhanced.props, enabled: plan.testimonial.enabled, maxItems: plan.testimonial.maxItems, style: plan.testimonial.style };
      }
      if (s.type === "stats") {
        enhanced.props = { ...enhanced.props, showOnMobile: plan.mobilePriority === "high" };
      }
      return enhanced;
    });
  }
}
