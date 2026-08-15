export interface ServiceData {
  id: string;
  title: string;
  description: string | null;
  price: number;
  duration: string | null;
  imageUrl: string | null;
  category: string | null;
  featured: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isActive: boolean;
  createdAt: Date;
  // RCCF-67.5 — explicit opt-in to be bookable via the Booking system.
  bookable: boolean;
}

export interface ServiceFormInput {
  title: string;
  description?: string;
  price: number;
  duration?: string;
  imageUrl?: string;
  category?: string;
  featured?: boolean;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  bookable?: boolean;
}
