import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WebsitePagesPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return <p className="p-6 text-zinc-500">Access denied</p>;

  const website = await prisma.website.findUnique({
    where: { tenantId },
    include: { pages: { include: { sections: true }, orderBy: { order: "asc" } } },
  });

  const pages = website?.pages || [];

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Pages</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage the pages of your website.</p>
      </div>

      {pages.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-500">No pages yet. Open the Builder to create your first page.</p>
          <Link href="/builder" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-s8ul-cyan px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
            Open Builder
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map((page) => (
            <div key={page.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/50 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white">{page.name}</h3>
                  {page.isHome && <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-400">Home</span>}
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">{page.slug} · {page.sections.length} sections</p>
              </div>
              <Link href="/builder" className="text-xs text-s8ul-cyan hover:underline">Edit in Builder</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
