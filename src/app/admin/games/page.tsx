import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GamesList } from "./_components/games-list";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { GAMES_ROUTE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminGamesPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return (
      <div className="rounded-lg bg-red-500/10 p-6 text-center text-red-400">
        <p className="text-lg font-semibold">No tenant configured</p>
      </div>
    );
  }

  let games: Awaited<ReturnType<typeof prisma.game.findMany>> = [];
  let error: string | null = null;

  try {
    games = await prisma.game.findMany({
      where: { tenantId },
      orderBy: { order: "asc" },
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load games";
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-500/10 p-6 text-center text-red-400">
        <p className="text-lg font-semibold">Failed to load games</p>
        <p className="mt-1 text-sm text-red-300">{error}</p>
        <p className="mt-2 text-xs text-red-400/60">
          Make sure the database migration has been run.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Games</h1>
          <p className="text-sm text-gray-400">
            Manage the games featured in the carousel
          </p>
        </div>
        <Link
          href={`${GAMES_ROUTE}/new`}
          className="inline-flex items-center justify-center rounded-lg bg-s8ul-cyan px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-s8ul-cyan/80"
        >
          + New Game
        </Link>
      </div>
      <ErrorBoundary>
        <GamesList games={games} />
      </ErrorBoundary>
    </div>
  );
}
