export interface LinkData {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  order: number;
  clicks: number;
  isActive: boolean;
  createdAt: Date;
}

export interface LinkFormInput {
  title: string;
  url: string;
  imageUrl?: string;
  isActive?: boolean;
}
