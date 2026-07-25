import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { GalleryBlueprint } from "./types";

export class GalleryComposer {
  compose(graph: KnowledgeGraph): GalleryBlueprint {
    const niche = graph.creator.niche;
    const hasVisualContent = ["photography", "art", "travel", "food", "fashion"].includes(niche);

    if (!hasVisualContent) {
      return {
        enabled: false,
        albums: [],
        featuredImages: [],
        ordering: "chronological",
        layout: "grid",
      };
    }

    const albums = [
      {
        id: "album_1",
        title: this.getAlbumTitle(niche, 1),
        caption: this.getAlbumCaption(niche, 1),
        images: [],
        coverImage: "",
        order: 1,
      },
      {
        id: "album_2",
        title: this.getAlbumTitle(niche, 2),
        caption: this.getAlbumCaption(niche, 2),
        images: [],
        coverImage: "",
        order: 2,
      },
    ];

    return {
      enabled: true,
      albums,
      featuredImages: [],
      ordering: "chronological",
      layout: "masonry",
    };
  }

  private getAlbumTitle(niche: string, index: number): string {
    if (index === 1) {
      const titles: Record<string, string> = {
        photography: "Portfolio",
        art: "My Artwork",
        travel: "Travel Moments",
        food: "Food Photography",
        fashion: "Style Gallery",
      };
      return titles[niche] ?? "Featured";
    }
    const titles: Record<string, string> = {
      photography: "Recent Work",
      art: "Behind the Scenes",
      travel: "Destinations",
      food: "Recipe Gallery",
      fashion: "Collections",
    };
    return titles[niche] ?? "More";
  }

  private getAlbumCaption(niche: string, index: number): string {
    if (index === 1) return `A curated collection of ${niche} content`;
    return `More ${niche} highlights and moments`;
  }
}
