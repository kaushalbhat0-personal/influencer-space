import { ProductForm } from "../_components/product-form";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="admin-gradient-text mb-6 text-2xl font-bold font-gaming">Add New Product</h1>
      <div className="max-w-2xl">
        <ProductForm mode="create" />
      </div>
    </div>
  );
}
