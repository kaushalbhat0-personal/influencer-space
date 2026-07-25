export interface ContentVocabulary {
  niche: string;
  label: string;

  hero: {
    headlineTemplate: string;
    subheadlineTemplate: string;
    cta: string;
    secondaryCta: string;
  };

  products: {
    sectionTitle: string;
    categoryLabel: string;
    emptyMessage: string;
  };

  gallery: {
    sectionTitle: string;
    albumLabel: string;
  };

  about: {
    sectionTitle: string;
  };

  contact: {
    sectionTitle: string;
    messagePlaceholder: string;
    successMessage: string;
  };

  faq: {
    sectionTitle: string;
    items: Array<{ q: string; a: string }>;
  };

  navigation: {
    homeLabel: string;
    productsLabel: string;
    galleryLabel: string;
    aboutLabel: string;
    contactLabel: string;
  };

  cta: {
    shopNow: string;
    learnMore: string;
    subscribe: string;
    getStarted: string;
  };

  emptyState: {
    noProducts: string;
    noGallery: string;
    noContent: string;
  };

  meta: {
    titleSuffix: string;
    descriptionPrefix: string;
  };
}
