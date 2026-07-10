import { notFound } from "next/navigation";
import { ProductService } from "@/services/product.service";
import { ProductForm } from "../../_components/product-form";

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await ProductService.findById(params.id);

  if (!product) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Edit Product</h1>
      <div className="max-w-lg">
        <ProductForm mode="edit" product={product} />
      </div>
    </div>
  );
}
