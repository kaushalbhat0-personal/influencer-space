"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent } from "@/components/ui/Card";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { createProduct, updateProduct } from "@/actions/product.actions";
import { PRODUCTS_ROUTE } from "@/lib/constants";
import type { ProductData } from "@/services/product.service";
import type { ProductActionState } from "@/actions/product.actions";

type ProductFormProps =
  | { mode: "create"; product?: never }
  | { mode: "edit"; product: ProductData };

export function ProductForm({ mode, product }: ProductFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<ProductActionState>({ success: false });
  const [pending, setPending] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>(product?.imageUrl || "");

  const serverAction = mode === "create" ? createProduct : updateProduct;

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
      router.push(PRODUCTS_ROUTE);
      router.refresh();
    }
  }

  return (
    <Card>
      <CardContent>
        <form ref={formRef} action={handleSubmit} className="space-y-6">
          {mode === "edit" && product && (
            <input type="hidden" name="id" value={product.id} />
          )}

          <Input
            id="name"
            name="name"
            label="Product Name"
            defaultValue={product?.name ?? ""}
            error={state.fieldErrors?.name?.[0]}
            required
          />

          <Textarea
            id="description"
            name="description"
            label="Description"
            defaultValue={product?.description ?? ""}
            error={state.fieldErrors?.description?.[0]}
            rows={4}
          />

          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            label="Price ($)"
            defaultValue={product?.price ?? ""}
            error={state.fieldErrors?.price?.[0]}
            required
          />

          <ImageUpload
            onUpload={setImageUrl}
            currentImage={imageUrl || null}
            folder="products"
            label="Product Image"
          />

          {state.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={pending}>
              {pending
                ? "Saving..."
                : mode === "create"
                  ? "Create Product"
                  : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(PRODUCTS_ROUTE)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
