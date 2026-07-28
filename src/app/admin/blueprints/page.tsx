import { blueprintRegistry } from "@/lib/blueprint/registry";
import { BlueprintGalleryClient } from "./blueprint-gallery-client";

export const dynamic = "force-dynamic";

export default async function BlueprintsPage() {
  const blueprints = blueprintRegistry.getAll();
  const categories = blueprintRegistry.getCategories();

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="admin-gradient-text text-2xl font-bold font-display">Website Blueprints</h1>
        <p className="mt-1 text-sm text-gray-400">Choose a starting template for your website. Blueprints determine your page structure and sections.</p>
      </div>
      <BlueprintGalleryClient blueprints={blueprints} categories={categories} />
    </div>
  );
}
