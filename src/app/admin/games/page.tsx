import Link from "next/link";
import { GameService } from "@/services/games.service";
import { GamesList } from "./_components/games-list";
import { GAMES_ROUTE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminGamesPage() {
  const games = await GameService.findAll();

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
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400"
        >
          + New Game
        </Link>
      </div>
      <GamesList games={games} />
    </div>
  );
}
