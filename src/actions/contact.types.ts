export type ContactData = {
  id: string;
  name: string;
  email: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export type ContactActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}
