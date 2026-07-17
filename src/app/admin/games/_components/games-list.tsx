"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GAMES_ROUTE } from "@/lib/constants";
import { deleteGame } from "@/actions/games.actions";
import type { GameData } from "@/services/games.service";

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
};

export function GamesList({ games }: { games: GameData[] }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("Delete this game?")) return;
    const result = await deleteGame(id);
    if (result.success) router.refresh();
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
    >
      <div className="overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th className="hidden sm:table-cell">Genre</th>
              <th className="hidden sm:table-cell">Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {games.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-500">
                  No games yet.{" "}
                  <Link href={`${GAMES_ROUTE}/new`} className="font-semibold text-s8ul-cyan hover:underline">
                    Add your first game
                  </Link>
                </td>
              </tr>
            ) : (
              games.map((game) => (
                <motion.tr key={game.id} variants={rowVariants} className="group">
                  <td>
                    <div className="flex items-center gap-3">
                      {game.logoUrl && (
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-white/10">
                          <img src={game.logoUrl} alt={game.name} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <span className="font-medium text-white">{game.name}</span>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell">
                    {game.genre ? (
                      <span className="admin-badge-cyan">{game.genre}</span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="hidden sm:table-cell">
                    <span className={game.isActive ? "admin-badge-active" : "admin-badge-inactive"}>
                      {game.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <Link href={`${GAMES_ROUTE}/${game.id}/edit`} className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-s8ul-cyan/10 hover:text-s8ul-cyan" title="Edit game">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </Link>
                      <button onClick={() => handleDelete(game.id)} className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400" title="Delete game">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
