import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function SuperAdminLoading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <LoadingSpinner size="lg" text="Loading..." />
    </div>
  );
}
