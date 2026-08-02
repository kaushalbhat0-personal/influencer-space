import type { Planner } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "@/lib/generation/planning-context/types";
import type { ExperiencePlan, NavigationPlan, NavigationLink } from "../types";

export class NavigationPlanner implements Planner {
  readonly id = "navigation";
  readonly produces = ["navigation"] as const;
  readonly dependsOn = [] as const;

  plan(graph: KnowledgeGraph, profile: ExperienceProfile, context: PlanningContext): Partial<ExperiencePlan> {
    const niche = graph.creator.niche;
    return {
      navigation: {
        style: context.authorityLevel === "high" ? "centered"
          : profile.creatorStage === "starting" ? "minimal"
          : "standard",
        sticky: profile.creatorStage !== "starting",
        transparent: context.brandingConsistency === "high" || context.brandingConsistency === "medium",
        searchEnabled: context.authorityLevel === "medium" || context.authorityLevel === "high",
        links: this.getNicheLinks(niche),
      } satisfies NavigationPlan,
    };
  }

  private getNicheLinks(niche: string): readonly NavigationLink[] {
    const linkSets: Record<string, NavigationLink[]> = {
      gaming: [
        { label: "Home", href: "/" },
        { label: "Videos", href: "/videos" },
        { label: "Live", href: "/live" },
        { label: "Community", href: "/community" },
        { label: "Merch", href: "/shop" },
      ],
      education: [
        { label: "Home", href: "/" },
        { label: "Courses", href: "/courses" },
        { label: "Notes", href: "/notes" },
        { label: "Results", href: "/results" },
      ],
      finance: [
        { label: "Home", href: "/" },
        { label: "Insights", href: "/insights" },
        { label: "Courses", href: "/courses" },
        { label: "Portfolio", href: "/portfolio" },
        { label: "Contact", href: "/contact" },
      ],
      photography: [
        { label: "Home", href: "/" },
        { label: "Portfolio", href: "/portfolio" },
        { label: "Prints", href: "/shop" },
        { label: "Workshops", href: "/workshops" },
      ],
      fitness: [
        { label: "Home", href: "/" },
        { label: "Programs", href: "/programs" },
        { label: "Coaching", href: "/coaching" },
        { label: "Nutrition", href: "/nutrition" },
      ],
      food: [
        { label: "Home", href: "/" },
        { label: "Recipes", href: "/recipes" },
        { label: "Cookbook", href: "/shop" },
        { label: "Blog", href: "/blog" },
      ],
      travel: [
        { label: "Home", href: "/" },
        { label: "Destinations", href: "/destinations" },
        { label: "Guides", href: "/guides" },
        { label: "Gallery", href: "/gallery" },
      ],
      music: [
        { label: "Home", href: "/" },
        { label: "Music", href: "/music" },
        { label: "Shows", href: "/shows" },
        { label: "Merch", href: "/shop" },
      ],
      art: [
        { label: "Home", href: "/" },
        { label: "Gallery", href: "/gallery" },
        { label: "Shop", href: "/shop" },
        { label: "Commissions", href: "/commissions" },
      ],
      lifestyle: [
        { label: "Home", href: "/" },
        { label: "Blog", href: "/blog" },
        { label: "Style", href: "/style" },
        { label: "Shop", href: "/shop" },
      ],
      sports: [
        { label: "Home", href: "/" },
        { label: "Highlights", href: "/highlights" },
        { label: "Training", href: "/training" },
        { label: "Shop", href: "/shop" },
      ],
      news: [
        { label: "Home", href: "/" },
        { label: "Latest", href: "/latest" },
        { label: "Analysis", href: "/analysis" },
        { label: "Subscribe", href: "/subscribe" },
      ],
      comedy: [
        { label: "Home", href: "/" },
        { label: "Videos", href: "/videos" },
        { label: "Shows", href: "/shows" },
        { label: "Merch", href: "/shop" },
      ],
      celebrity: [
        { label: "Home", href: "/" },
        { label: "Gallery", href: "/gallery" },
        { label: "Shop", href: "/shop" },
        { label: "Press", href: "/press" },
        { label: "Contact", href: "/contact" },
      ],
      technology: [
        { label: "Home", href: "/" },
        { label: "Projects", href: "/projects" },
        { label: "Blog", href: "/blog" },
        { label: "Products", href: "/products" },
      ],
    };
    return linkSets[niche] ?? [
      { label: "Home", href: "/" },
      { label: "Contact", href: "/contact" },
    ];
  }
}
