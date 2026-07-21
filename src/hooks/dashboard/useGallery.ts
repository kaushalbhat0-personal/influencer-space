"use client";

import { useCallback } from "react";
import { contentAppService } from "@/lib/application/content-app.service";
import type {
  GalleryDTO,
  CreateGalleryDTO,
  UpdateGalleryDTO,
} from "@/lib/application/dtos/gallery";
import type { GalleryMedia } from "@/lib/content/entities/gallery/types";
import { useAsyncState, useMutation } from "./useAsyncState";

export function useGallery(initialGalleries?: GalleryDTO[]) {
  const galleries = useAsyncState<GalleryDTO[]>(initialGalleries ?? []);
  const createMutation = useMutation<CreateGalleryDTO, GalleryDTO>();
  const updateMutation = useMutation<{ id: string; input: UpdateGalleryDTO }, GalleryDTO>();
  const deleteMutation = useMutation<string, boolean>();
  const addMediaMutation = useMutation<{ galleryId: string; media: GalleryMedia }, GalleryDTO>();
  const removeMediaMutation = useMutation<{ galleryId: string; mediaId: string }, boolean>();
  const setCoverImageMutation = useMutation<{ galleryId: string; mediaId: string | null }, GalleryDTO>();

  const refresh = useCallback(async (tenantId?: string) => {
    galleries.setLoading(true);
    try {
      if (tenantId) {
        const result = await contentAppService.getGalleries(tenantId);
        if (result.success && result.data) {
          galleries.setData(result.data);
        } else {
          galleries.setError(result.error?.message ?? "Failed to load galleries");
        }
      }
    } catch (e) {
      galleries.setError(e instanceof Error ? e.message : "Failed to load galleries");
    } finally {
      galleries.setLoading(false);
    }
  }, [galleries]);

  const create = useCallback(
    createMutation.execute(
      async (input: CreateGalleryDTO) => {
        const result = await contentAppService.createGallery(input);
        if (!result.success || !result.data) throw new Error(result.error?.message ?? "Failed");
        return result.data;
      }
    ),
    [createMutation]
  );

  const remove = useCallback(
    deleteMutation.execute(async (id: string) => {
      const result = await contentAppService.deleteGallery(id);
      if (!result.success) throw new Error(result.error?.message ?? "Failed");
      return true;
    }),
    [deleteMutation]
  );

  const addMedia = useCallback(
    addMediaMutation.execute(
      async ({ galleryId, media }: { galleryId: string; media: GalleryMedia }) => {
        const result = await contentAppService.addMediaToGallery(galleryId, media);
        if (!result.success || !result.data) throw new Error(result.error?.message ?? "Failed");
        return result.data;
      }
    ),
    [addMediaMutation]
  );

  const removeMedia = useCallback(
    removeMediaMutation.execute(
      async ({ galleryId, mediaId }: { galleryId: string; mediaId: string }) => {
        const result = await contentAppService.removeMediaFromGallery(galleryId, mediaId);
        if (!result.success) throw new Error(result.error?.message ?? "Failed");
        return true;
      }
    ),
    [removeMediaMutation]
  );

  const setCoverImage = useCallback(
    setCoverImageMutation.execute(
      async ({ galleryId, mediaId }: { galleryId: string; mediaId: string | null }) => {
        const result = await contentAppService.setGalleryCoverImage(galleryId, mediaId);
        if (!result.success || !result.data) throw new Error(result.error?.message ?? "Failed");
        return result.data;
      }
    ),
    [setCoverImageMutation]
  );

  return {
    galleries,
    refresh,
    create,
    remove,
    addMedia,
    removeMedia,
    setCoverImage,
    creating: createMutation.loading,
    updating: updateMutation.loading,
    deleting: deleteMutation.loading,
  };
}
