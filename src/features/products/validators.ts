import { z } from "zod/v4";

export const productFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(5000).optional(),
  price: z.number().min(0, "Price must be 0 or more"),
  imageUrl: z.string().optional(),
  images: z.array(z.string()).optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug").optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  type: z.enum(["digital", "physical", "service", "membership", "bundle"]),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
