import { ProductForm } from "../_components/product-form";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Add New Product</h1>
      <div className="max-w-lg">
        <ProductForm mode="create" />
      </div>
    </div>
  );
}
