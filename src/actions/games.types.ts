export type GameData = {
  id: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  genre: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

export type GameActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}
