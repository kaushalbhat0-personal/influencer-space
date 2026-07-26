export interface ProductData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  images: string[];
  slug: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  type: "digital" | "physical" | "service" | "membership" | "bundle";
  isActive: boolean;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductFormInput {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  images?: string[];
  slug?: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  type: "digital" | "physical" | "service" | "membership" | "bundle";
  isActive?: boolean;
  isFeatured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
}
