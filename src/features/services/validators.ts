import { z } from "zod/v4";

export const serviceFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  price: z.number().min(0),
  duration: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  isActive: z.boolean().optional(),
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;
