import { z } from "zod/v4";

export const galleryFormSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url(),
  mediaType: z.enum(["image", "video"]).optional(),
  videoUrl: z.string().url().optional().or(z.literal("")),
  altText: z.string().max(500).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isFeatured: z.boolean().optional(),
});

export type GalleryFormValues = z.infer<typeof galleryFormSchema>;
