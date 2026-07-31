import { z } from "zod/v4";

export const courseFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  price: z.number().min(0),
  imageUrl: z.string().url().optional().or(z.literal("")),
  category: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export type CourseFormValues = z.infer<typeof courseFormSchema>;
