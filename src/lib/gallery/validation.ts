import { z } from "zod";
import { CAPTION_MAX, ALT_TEXT_MAX } from "./constants";

export const galleryCreateSchema = z.object({
  url: z.string().min(1, "URL is required"),
  caption: z.string().max(CAPTION_MAX).optional(),
  altText: z.string().max(ALT_TEXT_MAX).optional(),
  isVideo: z.coerce.boolean().optional().default(false),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional().default("PUBLISHED"),
  isFeatured: z.coerce.boolean().optional().default(false),
  category: z.string().optional(),
  tags: z.string().optional(),
});

export const galleryUpdateSchema = galleryCreateSchema.partial();

export type GalleryCreateInput = z.infer<typeof galleryCreateSchema>;
export type GalleryUpdateInput = z.infer<typeof galleryUpdateSchema>;

export function getFirstValidationError(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }): string {
  const fields = error.flatten().fieldErrors;
  return fields.url?.[0] ?? fields.caption?.[0] ?? "Invalid input";
}
