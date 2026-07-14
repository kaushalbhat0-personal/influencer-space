"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
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

  const serverAction = mode === "create" ? createGalleryImage : updateGalleryImage;

  async function handleImageDelete(url: string) {
    const path = StorageService.extractPathFromUrl(url);
    if (path) {
      await StorageService.delete(path);
    }
    setImageUrl("");
  }

  async function handleSubmit(formData: FormData) {
    if (imageUrl) formData.set("imageUrl", imageUrl);
    formData.set("category", category);
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
          {mode === "edit" && image && (
            <input type="hidden" name="id" value={image.id} />
          )}

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
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-s8ul-cyan focus:outline-none focus:ring-1 focus:ring-s8ul-cyan"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            {state.fieldErrors?.category?.[0] && (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.category[0]}</p>
            )}
          </div>

          <ImageUpload
            onUpload={setImageUrl}
            onDelete={handleImageDelete}
            currentImage={imageUrl || null}
            folder={`gallery/${category}`}
            label="Gallery Image"
          />

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : mode === "create" ? "Create Image" : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push(GALLERY_ROUTE)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
