"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent } from "@/components/ui/Card";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { StorageService } from "@/services/storage.service";
import { createGalleryImage, updateGalleryImage } from "@/actions/gallery.actions";
import { GALLERY_ROUTE } from "@/lib/constants";
import type { GalleryImageData } from "@/services/gallery.service";
import type { GalleryActionState } from "@/actions/gallery.actions";

type Props =
  | { mode: "create"; image?: never }
  | { mode: "edit"; image: GalleryImageData };

const categories = [
  { value: "bgmi", label: "BGMI" },
  { value: "tournament", label: "Tournaments" },
  { value: "s8ul", label: "S8UL" },
  { value: "behind-scenes", label: "Behind the Scenes" },
];

export function GalleryForm({ mode, image }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<GalleryActionState>({ success: false });
  const [pending, setPending] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>(image?.imageUrl || "");
  const [category, setCategory] = useState(image?.category || "bgmi");
  const [mediaType, setMediaType] = useState<"image" | "video">(
    (image?.mediaType as "image" | "video") || "image",
  );
  const [videoUrl, setVideoUrl] = useState(image?.videoUrl || "");

  const serverAction = mode === "create" ? createGalleryImage : updateGalleryImage;

  async function handleImageDelete(url: string) {
    const path = StorageService.extractPathFromUrl(url);
    if (path) await StorageService.delete(path);
    setImageUrl("");
  }

  async function handleSubmit(formData: FormData) {
    if (imageUrl) formData.set("imageUrl", imageUrl);
    formData.set("category", category);
    formData.set("mediaType", mediaType);
    formData.set("videoUrl", videoUrl);
    setPending(true);
    setState({ success: false });
    const result = await serverAction(state, formData);
    setState(result);
    setPending(false);
    if (result.success) {
      router.push(GALLERY_ROUTE);
      router.refresh();
    }
  }

  return (
    <Card>
      <CardContent>
        <form ref={formRef} action={handleSubmit} className="space-y-6">
          {mode === "edit" && image && <input type="hidden" name="id" value={image.id} />}

          <Input
            id="title"
            name="title"
            label="Title"
            defaultValue={image?.title ?? ""}
            error={state.fieldErrors?.title?.[0]}
            required
          />

          <Textarea
            id="description"
            name="description"
            label="Description"
            defaultValue={image?.description ?? ""}
            error={state.fieldErrors?.description?.[0]}
            rows={3}
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Media Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mediaType"
                  value="image"
                  checked={mediaType === "image"}
                  onChange={(e) => setMediaType(e.target.value as "image" | "video")}
                  className="h-4 w-4 text-s8ul-cyan focus:ring-s8ul-cyan/50"
                />
                <span className="text-sm text-white">Image</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mediaType"
                  value="video"
                  checked={mediaType === "video"}
                  onChange={(e) => setMediaType(e.target.value as "image" | "video")}
                  className="h-4 w-4 text-s8ul-cyan focus:ring-s8ul-cyan/50"
                />
                <span className="text-sm text-white">Video</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="admin-select"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value} className="bg-gray-900 text-white">{cat.label}</option>
              ))}
            </select>
            {state.fieldErrors?.category?.[0] && (
              <p className="mt-1 text-sm text-red-400">{state.fieldErrors.category[0]}</p>
            )}
          </div>

          {mediaType === "image" ? (
            <ImageUpload
              onUpload={setImageUrl}
              onDelete={handleImageDelete}
              currentImage={imageUrl || null}
              folder={`gallery/${category}`}
              label="Gallery Image"
            />
          ) : (
            <Input
              id="videoUrl"
              name="videoUrl"
              label="Video URL"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
            />
          )}

          {state.error && <p className="text-sm text-red-400">{state.error}</p>}

          <div className="flex items-center gap-4 pt-2">
            <button type="submit" disabled={pending} className="admin-btn-cyan">
              {pending ? "Saving..." : mode === "create" ? "Create" : "Save Changes"}
            </button>
            <button type="button" onClick={() => router.push(GALLERY_ROUTE)} className="admin-btn-outline">
              Cancel
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
