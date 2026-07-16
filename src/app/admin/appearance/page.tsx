import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppearancePage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return (
      <div className="rounded-lg bg-red-500/10 p-6 text-center text-red-400">
        <p className="text-lg font-semibold">No tenant configured</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">🎨 Appearance & Theme</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Customize the look and feel of your public storefront.
        </p>
      </div>
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
        <p className="text-zinc-300">
          Theme customization is coming soon. For now, your storefront uses our highly optimized, high-converting dark template.
        </p>
      </div>
    </div>
  );
}
