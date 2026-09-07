import { EmptyState } from "@/components/ui/EmptyState";
import { Settings } from "lucide-react";
import { BRAND } from "@/lib/marketing/messaging";
export default function SettingsPlaceholder() {
  return <div className="pt-8"><EmptyState title="Platform Settings" description={`Global platform configuration. Coming in ${BRAND.name} v1.1.`} icon={Settings} /></div>;
}
