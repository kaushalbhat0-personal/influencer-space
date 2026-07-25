"use client";

import type { ManagedImage } from "@/components/products/ImageManager";
import { ImageManager } from "@/components/products/ImageManager";

interface Props {
  images: ManagedImage[];
  onImagesChange: (images: ManagedImage[]) => void;
  tenantId: string;
}

export function ProductMediaSection({ images, onImagesChange, tenantId }: Props) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-white mb-3">Media</legend>
      <ImageManager
        images={images}
        onChange={onImagesChange}
        tenantId={tenantId}
      />
    </fieldset>
  );
}
