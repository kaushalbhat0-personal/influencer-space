import { EmptyState } from "@/components/ui/EmptyState";
import { Palette } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ThemesPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Themes</h1>
        <p className="mt-1 text-sm text-zinc-400">Marketplace themes and templates.</p>
      </div>
      <EmptyState
        title="Theme marketplace coming soon"
        description="Pre-built themes and templates for creators and agencies."
        icon={Palette}
      />
    </div>
  );
}
