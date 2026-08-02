import type { PageBlueprint, NavigationBlueprint } from "./types";

export class NavigationComposer {
  compose(pages: PageBlueprint[]): NavigationBlueprint {
    const desktop: NavigationBlueprint["desktop"] = [];
    const mobile: NavigationBlueprint["mobile"] = [];
    const bottom: NavigationBlueprint["bottom"] = [];
    const mobileBottom: NavigationBlueprint["mobileBottom"] = [];

    const visiblePages = pages.filter((p) => p.visible).sort((a, b) => a.order - b.order);

    for (const page of visiblePages) {
      const item = {
        label: page.title,
        href: `/${page.slug.split("/").slice(1).join("/")}`,
        order: page.order,
        children: [],
      };

      desktop.push(item);
      mobile.push(item);

      if (page.order <= 3) {
        bottom.push(item);
        mobileBottom.push({
          label: page.title,
          href: `/${page.slug.split("/").slice(1).join("/")}`,
          order: page.order,
          children: [],
          icon: this.getIconForPage(page.type),
        });
      }
    }

    return {
      desktop,
      mobile: mobile.length > 5 ? mobile.slice(0, 5) : mobile,
      bottom: bottom.slice(0, 4),
      mobileBottom: mobileBottom.slice(0, 5),
      sticky: true,
      style: "standard",
    };
  }

  private getIconForPage(type: string): string {
    const icons: Record<string, string> = {
      home: "Home",
      products: "ShoppingBag",
      gallery: "Image",
      contact: "Mail",
      blog: "FileText",
    };
    return icons[type] ?? "Link";
  }
}
