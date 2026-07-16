import { notFound } from "next/navigation";
import { ProductService } from "@/services/product.service";
import { ProductForm } from "../../_components/product-form";
import { getTenantContext } from "@/lib/tenant";

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const tenant = await getTenantContext();
  if (!tenant) notFound();

  let product;
  try {
    product = await ProductService.findById(params.id, tenant.id);
  } catch {
    notFound();
  }
  if (!product) notFound();

  return (
    <div>
      <h1 className="admin-gradient-text mb-6 text-2xl font-bold font-display">Edit Product</h1>
      <div className="max-w-2xl">
        <ProductForm mode="edit" product={product} />
      </div>
    </div>
  );
}
