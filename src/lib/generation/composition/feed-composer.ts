import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { FeedBlueprint } from "./types";

export class FeedComposer {
  compose(graph: KnowledgeGraph): FeedBlueprint {
    const hasContent = graph.content.topContentTypes.length > 0;
    const quality = graph.content.contentQuality;

    return {
      enabled: hasContent,
      source: graph.creator.platform || "social",
      limit: quality === "high" ? 9 : 6,
      layout: quality === "high" ? "grid" : "list",
      showCaptions: true,
      autoplay: graph.content.postingSchedule === "daily",
    };
  }
}
