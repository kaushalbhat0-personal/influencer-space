import { z } from "zod/v4";

export const testimonialFormSchema = z.object({
  author: z.string().min(1, "Author is required").max(100),
  role: z.string().max(100).optional(),
  content: z.string().min(1, "Content is required").max(2000),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  rating: z.number().min(1).max(5).optional(),
  featured: z.boolean().optional(),
  category: z.string().optional(),
});

export type TestimonialFormValues = z.infer<typeof testimonialFormSchema>;
