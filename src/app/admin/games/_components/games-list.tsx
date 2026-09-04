"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { GAMES_ROUTE } from "@/lib/constants";
import { deleteGame } from "@/actions/games.actions";
import type { GameData } from "@/actions/games.types";
import { EmptyState } from "@/components/ui/EmptyState";
import { PackageOpen } from "lucide-react";

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
};

export function GamesList({ games }: { games: GameData[] }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState<GameData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirmDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteGame(confirmDelete.id);
    if (result.success) {
      setConfirmDelete(null);
      router.refresh();
    } else {
      setDeleteError(result.error ?? "Failed to delete game");
    }
    setIsDeleting(false);
  }

  if (games.length === 0) {
    return (
      <EmptyState
        title="No games yet"
        description="Add your first game to feature it in the carousel."
        icon={PackageOpen}
        action={
          <Link href={`${GAMES_ROUTE}/new`} className="btn-primary text-sm">
            Add Game
          </Link>
        }
      />
    );
  }

  return (
    <>
      {deleteError && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-600" role="alert">
          {deleteError}
        </div>
      )}
      <motion.div
        initial="hidden"
        animate="show"
        className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-card)]"
        style={{ boxShadow: "var(--shadow-elevation)" }}
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
              {games.map((game) => (
                <motion.tr key={game.id} variants={rowVariants} className="group">
                  <td>
                    <div className="flex items-center gap-3">
                      {game.logoUrl && (
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
                          <img src={game.logoUrl} alt={game.name} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <span className="font-medium text-[var(--text-primary)]">{game.name}</span>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell">
                    {game.genre ? (
                      <span className="admin-badge-cyan">{game.genre}</span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="hidden sm:table-cell">
                    <span className={game.isActive ? "admin-badge-active" : "admin-badge-inactive"}>
                      {game.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`${GAMES_ROUTE}/${game.id}/edit`} aria-label={`Edit ${game.name}`} className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--brand-primary)]" title="Edit game">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </Link>
                      <button onClick={() => setConfirmDelete(game)} aria-label={`Delete ${game.name}`} className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400" title="Delete game">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={`Delete ${confirmDelete.name}`}>
          <div className="absolute inset-0 bg-[var(--surface-overlay)]/20 backdrop-blur-sm" onClick={() => !isDeleting && setConfirmDelete(null)} />
          <div className="relative admin-card p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Delete &quot;{confirmDelete.name}&quot;?</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">This will permanently delete the game. This cannot be undone.</p>
            {deleteError && <p className="mt-3 text-xs text-red-600" role="alert">{deleteError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} disabled={isDeleting} className="btn-secondary text-sm disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={isDeleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50" aria-label={`Confirm delete ${confirmDelete.name}`}>
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
