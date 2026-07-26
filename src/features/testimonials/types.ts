export interface TestimonialData {
  id: string;
  author: string;
  role: string | null;
  content: string;
  avatarUrl: string | null;
  rating: number;
  featured: boolean;
  category: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface TestimonialFormInput {
  author: string;
  role?: string;
  content: string;
  avatarUrl?: string;
  rating?: number;
  featured?: boolean;
  category?: string;
}
