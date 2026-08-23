import { z } from "zod/v4";
import { COMMERCE_MODES } from "@/config/commerce/commerce-mode";
import { PRODUCT_TYPE_REGISTRY } from "@/modules/product-types";
import type { ProductTypeId } from "@/modules/product-types";

const PRODUCT_TYPE_IDS = PRODUCT_TYPE_REGISTRY.map((t) => t.id) as [ProductTypeId, ...ProductTypeId[]];

export const productFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(5000).optional(),
  price: z.number().min(0, "Price must be 0 or more"),
  imageUrl: z.string().optional(),
  images: z.array(z.string()).optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug").optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  // RCCF-IMPLEMENTATION-74: canonical product-type registry is the sole
  // vocabulary (digital/physical/course/service/booking/affiliate/donation).
  type: z.enum(PRODUCT_TYPE_IDS),
  // RCCF-66.2: exactly ONLINE | WHATSAPP | BOTH. Unknown/arbitrary strings are
  // rejected server-side.
  commerceMode: z.enum(COMMERCE_MODES).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
