export interface FAQItemData {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
}

export interface FAQFormInput {
  question: string;
  answer: string;
  category?: string;
}
