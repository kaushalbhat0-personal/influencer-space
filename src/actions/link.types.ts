export type LinkData = {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  clicks: number;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
