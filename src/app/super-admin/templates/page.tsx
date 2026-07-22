import { EmptyState } from "@/components/ui/EmptyState";
import { Layers } from "lucide-react";
export default function TemplatesPlaceholder() {
  return <div className="pt-8"><EmptyState title="Templates" description="Website template library and management. Coming in CreatorStore v1.1." icon={Layers} /></div>;
}
