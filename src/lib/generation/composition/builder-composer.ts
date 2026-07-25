import type { SectionBlueprint, BuilderBlueprint, BuilderBlock, PageBlueprint } from "./types";

export class BuilderComposer {
  compose(sections: SectionBlueprint[], pages: PageBlueprint[]): BuilderBlueprint {
    const blocks: BuilderBlock[] = [];

    for (const section of sections) {
      const block = this.sectionToBlock(section);
      blocks.push(block);
    }

    for (const page of pages) {
      const pageBlock: BuilderBlock = {
        id: `block_page_${page.type}`,
        type: "page",
        props: {
          pageType: page.type,
          title: page.title,
          slug: page.slug,
          visible: page.visible,
        },
        children: sections
          .filter((s) => s.page === page.type)
          .map((s) => `block_${s.id}`),
        locked: true,
        metadata: { pageId: page.id },
      };
      blocks.push(pageBlock);
    }

    return {
      version: 1,
      blocks,
      layout: "single",
      containerWidth: "1200px",
      metadata: { generatedAt: new Date().toISOString() },
    };
  }

  private sectionToBlock(section: SectionBlueprint): BuilderBlock {
    return {
      id: `block_${section.id}`,
      type: section.type,
      props: { ...section.props },
      children: [],
      locked: false,
      metadata: {
        sectionId: section.id,
        page: section.page,
        order: section.order,
        reason: section.reason,
      },
    };
  }
}
