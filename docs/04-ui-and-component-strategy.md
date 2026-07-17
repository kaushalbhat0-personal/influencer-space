# 04 — UI & Component Strategy

## Component Architecture

```
┌──────────────────────────────────────────────┐
│  Admin Panel (left)          Preview (right) │
│  ┌─────────────────────┐    ┌──────────────┐ │
│  │  ProductsManager    │    │ PreviewShell │ │
│  │  ┌───────────────┐  │    │ ┌──────────┐ │ │
│  │  │ ImageUploader │  │    │ │ProductGrid│ │ │
│  │  │ (ref-based)   │  │    │ │(preview)  │ │ │
│  │  └───────────────┘  │    │ └──────────┘ │ │
│  │  Name, Price, Desc  │    │              │ │
│  │  [Add Product]      │    │  (real-time  │ │
│  └─────────────────────┘    │   renders    │ │
│                              │   from local │ │
│  Product Grid (editable)    │   state)     │ │
│  - reorder, toggle, delete  │              │ │
│                              └──────────────┘ │
└──────────────────────────────────────────────┘
```

## PreviewShell — Responsive Scaling

`src/components/admin/PreviewShell.tsx`

A sticky sidebar that renders the public components inside a scaled frame. The key insight: **the preview shows the same components the public page uses**, just with a `preview` prop enabled.

```typescript
// Device breakpoints
const deviceConfig = {
  mobile:  { width: 375,  label: "Mobile",  icon: Smartphone },
  tablet:  { width: 768,  label: "Tablet",  icon: Tablet },
  desktop: { width: 1200, label: "Desktop", icon: Monitor },
};
```

**Scaling logic:**
```typescript
const availWidth = containerWidth - 32; // 16px gutter each side
const scale = cfg.width > availWidth ? availWidth / cfg.width : 1;
```

Uses `ResizeObserver` on the container `<div>` to track available width, then computes a `transform: scale(ratio)` with `transformOrigin: top left`. The inner scrollable frame maintains `overflow-y: auto` so the preview is independently scrollable.

**States:**
- Empty card: dashed-border placeholder with descriptive message (e.g., "No gallery items yet")
- Populated: renders actual `ProductGrid`, `GallerySection`, or `TimelineSection` with the `preview` prop

## ImageUploader — Ref-Based Transactional Upload

`src/components/admin/ImageUploader.tsx`

A `forwardRef` component that encapsulates the entire file-to-URL pipeline. The parent interacts **solely through the ref**:

```typescript
export interface ImageUploaderHandle {
  upload: () => Promise<string | null>;  // uploads to Supabase, returns public URL
  reset: () => void;                     // clears file/preview/input
}
```

**Props:** `tenantId`, `folder`, `accept?`, `onFileSelect?`, `onUploadingChange?`

### The Upload Flow

```
1. User clicks dashed border → hidden <input type="file"> opens
        │
2. File selected → URL.createObjectURL(preview)
        │         → onFileSelect(file, blobUrl) ← parent gets blob for PreviewShell
        ▼
   ┌────────────────────┐
   │ 📁 photo.jpg  [✕] │ ← thumbnail + name + remove button
   └────────────────────┘
        │
3. User clicks "Save" → parent calls uploaderRef.current.upload()
        │
        │  isUploading = true → spinner shows "Uploading..."
        │  onUploadingChange(true) → parent disables submit button
        │
4. uploadToSupabase(file, tenantId, folder)
        │  Path: {tenantId}/{folder}/{timestamp}-{random}.{ext}
        │  Bucket: "influencer-images" (public)
        │
5. Returns public URL (e.g., https://xxx.supabase.co/.../products/123-abc.jpg)
        │
6. Parent calls server action with the URL → DB write → local state update → PreviewShell re-renders
```

**Why two callbacks?**

- `onFileSelect(file, blobUrl)` — fires immediately on selection. Parent stores the blob URL for an **optimistic preview** in the PreviewShell (shows the image before it's uploaded to Supabase).
- `onUploadingChange(isUploading)` — fires on upload start/end. Parent disables the submit button during upload to prevent double-submissions.

### Blob URL Safety

```typescript
useEffect(() => {
  return () => { if (preview) URL.revokeObjectURL(preview); };
}, [preview]);
```

The old blob URL is also revoked when a new file is selected or the user clicks the remove button. No memory leaks from orphaned blob URLs.

## ProductsManager — Local-First Preview Sync

`src/app/admin/products/_components/products-manager.tsx`

The canonical example of the local-first pattern:

```typescript
// 1. Derive preview products from LOCAL state (not from server refetch)
const previewProducts = products
  .filter(p => p.isActive)
  .map(p => ({ id, name, description, price, imageUrl }));

// 2. If the form has unsaved data, inject an optimistic entry
if (name.trim() || price.trim() || pendingFilePreview) {
  previewProducts.unshift({
    id: "pending",
    name: name || "New Product",
    description: description || null,
    price: price ? parseFloat(price) : 0,
    imageUrl: pendingFilePreview,  // ← blob URL, shows immediately
  });
}

// 3. Every mutation updates local state BEFORE server confirms
async function handleToggle(id, currentActive) {
  setProducts(prev => prev.map(p =>
    p.id === id ? { ...p, isActive: !currentActive } : p
  ));
  const result = await toggleProductStatus(id, tenantId, !currentActive);
  // ... (on failure, revert — but success is the default)
}
```

**The PreviewShell re-renders instantly** because it reads from the same local `products` state that `previewProducts` derives from. No server round-trip needed for visual feedback.

### The handleAdd Flow

```
1. User fills form → selects file → blob preview shows in PreviewShell (optimistic)
2. User clicks "Add Product"
3. uploaderRef.current.upload() → waits for Supabase
4. On success: createNewProduct(tenantId, formData) → server action
5. Server action: requireAuth → prisma.product.create → logAction → return ProductData
6. setProducts(prev => [result.data, ...prev])
7. PreviewShell re-renders with real URL replacing blob URL
8. resetForm() → uploaderRef.current.reset()
```

## EditableSection — Hover-Reveal Admin Link

`src/components/public/EditableSection.tsx`

A wrapper that overlays an "Edit" button for admins viewing their own public page:

```tsx
<EditableSection className="mt-10" editHref="/admin/settings/content">
  <ContentFeed items={feed} />
</EditableSection>
```

The Edit button uses `opacity-0 group-hover:opacity-100` — invisible by default, appears on hover. This keeps the public page clean while giving admins quick access to the relevant settings panel.

## Shared Public Components

All components accept a `preview` boolean prop:

| Component | When `preview=true` and empty | When populated |
|-----------|------------------------------|----------------|
| `ProductGrid` | Dashed border: "Your store is empty" | Product cards with BuyNowButton |
| `GallerySection` | Dashed border: "No gallery items yet" | Image grid + YouTube embeds |
| `TimelineSection` | Dashed border: "No milestones yet" | Timeline with year/stats badges |

When `preview` is false/omitted and the items array is empty, these components return `null` (matching the `{length > 0 && ...}` guard in `page.tsx`).

## BuyNowButton — Razorpay Checkout

`src/app/[domain]/_components/buy-now-button.tsx`

A client component that:
1. Dynamically loads the Razorpay SDK script on button click (lazy loading — no render-blocking)
2. Calls `createCheckoutOrder` server action to create a `ProductOrder` + Razorpay order
3. Opens the Razorpay checkout modal with UPI/card/netbanking
4. On `payment.capture` success: calls `verifyPayment` server action, fires confetti animation

## State Sync Architecture

```
Admin Panel                      PreviewShell
┌──────────────┐               ┌──────────────┐
│ local state: │──────────────→│ reads from    │
│ products[]   │  derived      │ same state    │
│ images[]     │  directly     │               │
│ milestones[] │               │               │
│              │               │               │
│ mutate →     │               │ re-renders    │
│ setState()   │               │ instantly     │
│              │               │               │
│ then: server │               │               │
│ action →     │               │               │
│ confirm      │               │               │
└──────────────┘               └──────────────┘
```

**Key principle:** The PreviewShell is NOT a sandbox or iframe. It's a direct React child that renders the SAME public components from the SAME local state. This guarantees visual parity — what you see in the preview is what the public page renders.
