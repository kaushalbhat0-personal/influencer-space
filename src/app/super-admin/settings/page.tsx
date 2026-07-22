import { EmptyState } from "@/components/ui/EmptyState";
import { Settings } from "lucide-react";
export default function SettingsPlaceholder() {
  return <div className="pt-8"><EmptyState title="Platform Settings" description="Global platform configuration. Coming in CreatorStore v1.1." icon={Settings} /></div>;
}
