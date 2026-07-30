import { getNavigation } from "@/actions/navigation.actions";
import { NavigationManager } from "./_components/navigation-manager";

export const dynamic = "force-dynamic";

export default async function WebsiteNavigationPage() {
  const result = await getNavigation();

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Navigation</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage your website&apos;s navigation menu. Changes are saved immediately and included in the next publish.</p>
      </div>
      <NavigationManager initialItems={result.success ? result.data ?? [] : []} />
    </div>
  );
}
