import { EmptyState } from "@/components/ui/EmptyState";
import { Globe } from "lucide-react";
export default function DomainsPlaceholder() {
  return <div className="pt-8"><EmptyState title="Domain Management" description="Custom domain overview, SSL status, and DNS verification. Coming in CreatorStore v1.1." icon={Globe} /></div>;
}
