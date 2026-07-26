"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { CrudTable } from "@/features/_shared/components/crud-table";
import { EditDrawer } from "@/features/_shared/components/edit-drawer";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import type { Column } from "@/features/_shared/components/crud-table";
import type { ProductData, ProductFormInput } from "../types";
import { createProduct, updateProduct, deleteProduct } from "../actions";

interface ProductsPageProps {
  initialData: ProductData[];
}

export function ProductsPage({ initialData }: ProductsPageProps) {
  const [products, setProducts] = useState<ProductData[]>(initialData);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ProductData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<ProductFormInput>({
    name: "",
    price: 0,
    type: "digital",
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", price: 0, type: "digital" });
    setDrawerOpen(true);
  };

  const openEdit = (product: ProductData) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description ?? undefined,
      price: product.price,
      imageUrl: product.imageUrl ?? undefined,
      slug: product.slug ?? undefined,
      status: product.status,
      type: product.type,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      seoTitle: product.seoTitle ?? undefined,
      seoDescription: product.seoDescription ?? undefined,
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (editing) {
        const updated = await updateProduct(editing.id, form);
        setProducts((prev) => prev.map((p) => (p.id === editing.id ? updated : p)));
      } else {
        const created = await createProduct(form);
        setProducts((prev) => [created, ...prev]);
      }
      setDrawerOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const columns: Column<Record<string, unknown>>[] = [
    { key: "name", header: "Name", render: (p: Record<string, unknown>) => (p as unknown as ProductData).name, sortable: true },
    {
      key: "status",
      header: "Status",
      render: (p: Record<string, unknown>) => {
        const d = p as unknown as ProductData;
        return (
          <Badge variant={d.status === "PUBLISHED" ? "default" : "warning"}>{d.status}</Badge>
        );
      },
      sortable: true,
    },
    {
      key: "price",
      header: "Price",
      render: (p: Record<string, unknown>) => {
        const d = p as unknown as ProductData;
        return `₹${d.price.toLocaleString("en-IN")}`;
      },
      sortable: true,
    },
    {
      key: "type",
      header: "Type",
      render: (p: Record<string, unknown>) => <span className="text-xs text-zinc-500">{(p as unknown as ProductData).type}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (p: Record<string, unknown>) => {
        const d = p as unknown as ProductData;
        return (
          <div className="flex items-center gap-2">
            <button onClick={() => openEdit(d)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-200" aria-label={`Edit ${d.name}`}>
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => handleDelete(d.id)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400" aria-label={`Delete ${d.name}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <FeaturePage
      title="Products"
      description="Manage your products."
      actions={
        <button onClick={openCreate} className="btn-primary text-xs">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      }
    >
      <CrudTable
        columns={columns}
        data={products as unknown as Record<string, unknown>[]}
        keyExtractor={(p) => (p as unknown as ProductData).id}
        searchable
        searchKeys={["name"]}
        emptyMessage="No products yet. Create your first product."
      />

      <EditDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `Edit ${editing.name}` : "New Product"}
        isSaving={isSaving}
      >
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Textarea label="Description" value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={4} />
          <Input label="Price (₹)" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} />
          <Input label="Slug" value={form.slug ?? ""} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving || !form.name}
              className="btn-primary flex-1 text-sm"
            >
              {isSaving ? "Saving..." : editing ? "Update" : "Create"}
            </button>
            <button
              onClick={() => setDrawerOpen(false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </EditDrawer>
    </FeaturePage>
  );
}
