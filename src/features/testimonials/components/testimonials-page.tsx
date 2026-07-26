"use client";

import { useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { CrudTable } from "@/features/_shared/components/crud-table";
import { EditDrawer } from "@/features/_shared/components/edit-drawer";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import type { Column } from "@/features/_shared/components/crud-table";
import type { TestimonialData, TestimonialFormInput } from "../types";
import { createTestimonial, deleteTestimonial } from "../actions";

interface TestimonialsPageProps {
  initialData: TestimonialData[];
  tenantId: string;
}

export function TestimonialsPage({ initialData, tenantId: _tenantId }: TestimonialsPageProps) {
  const [items, setItems] = useState<TestimonialData[]>(initialData);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<TestimonialFormInput>({ author: "", content: "" });

  const handleCreate = async () => {
    const created = await createTestimonial(form);
    setItems((prev) => [...prev, created]);
    setDrawerOpen(false);
    setForm({ author: "", content: "" });
  };

  const handleDelete = async (id: string) => {
    await deleteTestimonial(id);
    setItems((prev) => prev.filter((t) => t.id !== id));
  };

  const columns: Column<Record<string, unknown>>[] = [
    { key: "author", header: "Author", render: (t: Record<string, unknown>) => (t as unknown as TestimonialData).author, sortable: true },
    { key: "content", header: "Content", render: (t: Record<string, unknown>) => (
      <span className="text-sm text-zinc-400 line-clamp-1">{(t as unknown as TestimonialData).content}</span>
    )},
    {
      key: "rating",
      header: "Rating",
      render: (t: Record<string, unknown>) => {
        const d = t as unknown as TestimonialData;
        return (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: d.rating }).map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
            ))}
          </div>
        );
      },
    },
    {
      key: "featured",
      header: "Featured",
      render: (t: Record<string, unknown>) => (t as unknown as TestimonialData).featured ? <Badge variant="default">Featured</Badge> : null,
    },
    {
      key: "actions",
      header: "",
      render: (t: Record<string, unknown>) => {
        const d = t as unknown as TestimonialData;
        return (
          <button onClick={() => handleDelete(d.id)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400" aria-label={`Delete ${d.author}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        );
      },
    },
  ];

  return (
    <FeaturePage
      title="Testimonials"
      description="Manage customer testimonials."
      actions={
        <button onClick={() => setDrawerOpen(true)} className="btn-primary text-xs">
          <Plus className="h-4 w-4" /> Add Testimonial
        </button>
      }
    >
      <CrudTable
        columns={columns}
        data={items as unknown as Record<string, unknown>[]}
        keyExtractor={(t) => (t as unknown as TestimonialData).id}
        searchable
        searchKeys={["author", "content"]}
        emptyMessage="No testimonials yet."
      />

      <EditDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New Testimonial">
        <div className="space-y-4">
          <Input label="Author" value={form.author} onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))} />
          <Input label="Role" value={form.role ?? ""} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
          <Textarea label="Content" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} rows={4} />
          <Input label="Rating (1-5)" type="number" min={1} max={5} value={form.rating ?? 5} onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="featured" checked={form.featured ?? false} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} className="rounded border-white/10" />
            <label htmlFor="featured" className="text-sm text-zinc-300">Featured</label>
          </div>
          <button onClick={handleCreate} disabled={!form.author || !form.content} className="btn-primary w-full text-sm">
            Create
          </button>
        </div>
      </EditDrawer>
    </FeaturePage>
  );
}
