"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { createAffiliate, updateAffiliate } from "@/actions/affiliate.actions";
import { AFFILIATES_ROUTE } from "@/lib/constants";
import type { AffiliateData } from "@/services/affiliate.service";
import type { AffiliateActionState } from "@/actions/affiliate.actions";

type AffiliateFormProps =
  | { mode: "create"; affiliate?: never }
  | { mode: "edit"; affiliate: AffiliateData };

export function AffiliateForm({ mode, affiliate }: AffiliateFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<AffiliateActionState>({ success: false });
  const [pending, setPending] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>(affiliate?.imageUrl || "");

  const serverAction = mode === "create" ? createAffiliate : updateAffiliate;

  async function handleSubmit(formData: FormData) {
    if (imageUrl) {
      formData.set("imageUrl", imageUrl);
    }
    setPending(true);
    setState({ success: false });
    const result = await serverAction(state, formData);
    setState(result);
    setPending(false);

    if (result.success) {
      router.push(AFFILIATES_ROUTE);
      router.refresh();
    }
  }

  return (
    <Card>
      <CardContent>
        <form ref={formRef} action={handleSubmit} className="space-y-6">
          {mode === "edit" && affiliate && (
            <input type="hidden" name="id" value={affiliate.id} />
          )}

          <Input
            id="title"
            name="title"
            label="Title"
            defaultValue={affiliate?.title ?? ""}
            error={state.fieldErrors?.title?.[0]}
            placeholder="e.g., My Favorite Camera"
            required
          />

          <Input
            id="url"
            name="url"
            label="Affiliate URL"
            type="url"
            defaultValue={affiliate?.url ?? ""}
            error={state.fieldErrors?.url?.[0]}
            placeholder="https://amazon.com/..."
            required
          />

          <ImageUpload
            onUpload={setImageUrl}
            currentImage={imageUrl || null}
            folder="affiliates"
            label="Affiliate Image"
          />

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              defaultChecked={affiliate?.isActive ?? true}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Active (visible on public site)
            </label>
          </div>

          {state.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={pending}>
              {pending
                ? "Saving..."
                : mode === "create"
                  ? "Create Affiliate"
                  : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(AFFILIATES_ROUTE)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
