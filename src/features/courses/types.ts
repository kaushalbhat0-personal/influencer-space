export interface CourseData {
  id: string;
  title: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: string | null;
  featured: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  moduleCount: number;
  lessonCount: number;
  createdAt: Date;
}

export interface CourseFormInput {
  title: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category?: string;
  featured?: boolean;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}
