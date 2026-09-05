import { blueprintRegistry } from "@/lib/blueprint/registry";
import { BlueprintGalleryClient } from "./_components/blueprint-gallery-client";

export const dynamic = "force-dynamic";

export default async function BlueprintsPage() {
  const blueprints = blueprintRegistry.getAll();
  const categories = blueprintRegistry.getCategories();

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="platform-display">Website Templates</h1>
        <p className="platform-body mt-1.5">Choose a starting template for your website. Templates determine your page structure and sections.</p>
      </div>
      <BlueprintGalleryClient blueprints={blueprints} categories={categories} />
    </div>
  );
}
