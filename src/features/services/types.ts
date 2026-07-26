export interface ServiceData {
  id: string;
  title: string;
  description: string | null;
  price: number;
  duration: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isActive: boolean;
  order: number;
  createdAt: Date;
}

export interface ServiceFormInput {
  title: string;
  description?: string;
  price: number;
  duration?: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isActive?: boolean;
}
