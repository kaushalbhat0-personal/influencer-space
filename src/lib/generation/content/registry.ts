import type { ContentVocabulary } from "./types";
import { ALL_VOCABULARIES, DEFAULT_VOCABULARY } from "./vocabularies";

export class ContentStrategyRegistry {
  private store = new Map<string, ContentVocabulary>();

  constructor() {
    for (const v of ALL_VOCABULARIES) this.store.set(v.niche, v);
  }

  get(niche: string): ContentVocabulary {
    return this.store.get(niche) ?? DEFAULT_VOCABULARY;
  }

  register(vocabulary: ContentVocabulary): void {
    if (this.store.has(vocabulary.niche)) {
      throw new Error(`Vocabulary already registered for niche: ${vocabulary.niche}`);
    }
    this.store.set(vocabulary.niche, vocabulary);
  }

  getAll(): ContentVocabulary[] {
    return Array.from(this.store.values());
  }

  listNiches(): string[] {
    return Array.from(this.store.keys());
  }
}
