import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { SectionBlueprint, NavItem } from "./types";

export class FooterComposer {
  compose(graph: KnowledgeGraph, navItems: NavItem[]): SectionBlueprint {
    const name = graph.creator.name || graph.brand.name;

    return {
      id: "section_footer",
      type: "footer",
      page: "home",
      order: 999,
      props: {
        showSocialLinks: true,
        socialLinks: graph.socialLinks.map((l) => ({ platform: l.platform, url: l.url, handle: l.handle })),
        showNewsletter: false,
        showBackToTop: true,
        navigation: this.getFooterNav(navItems),
        copyright: `© ${new Date().getFullYear()} ${name}. All rights reserved.`,
        branding: `Powered by Influencer Space`,
      },
      reason: "Footer with navigation, social links, and copyright",
      confidence: 0.9,
    };
  }

  private getFooterNav(items: NavItem[]): Array<{ title: string; links: Array<{ label: string; href: string }> }> {
    const mainLinks = items.map((i) => ({ label: i.label, href: i.href }));
    return [
      { title: "Navigation", links: mainLinks },
    ];
  }
}
