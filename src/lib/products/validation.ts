import { z } from "zod";
import { PRODUCT_NAME_MAX, PRODUCT_DESC_MAX, SEO_TITLE_MAX, SEO_DESC_MAX, SLUG_MAX } from "./constants";

export const productCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(PRODUCT_NAME_MAX),
  description: z.string().max(PRODUCT_DESC_MAX).optional().default(""),
  price: z.coerce.number().positive("Price must be greater than 0"),
  imageUrl: z.string().optional().or(z.literal("")),
  images: z.string().optional().default("[]"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional().default("PUBLISHED"),
  isFeatured: z.coerce.boolean().optional().default(false),
  slug: z.string().max(SLUG_MAX).optional(),
  seoTitle: z.string().max(SEO_TITLE_MAX).optional(),
  seoDescription: z.string().max(SEO_DESC_MAX).optional(),
});

export const productUpdateSchema = productCreateSchema;

export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export function getFirstValidationError(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }): string {
  const fields = error.flatten().fieldErrors;
  return fields.name?.[0] ?? fields.price?.[0] ?? fields.imageUrl?.[0] ?? "Invalid input";
}
