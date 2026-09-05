import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GameForm } from "../../_components/games-form";

export default async function EditGamePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) notFound();

  let game;
  try {
    // RCCF-63.2 — load only a game owned by the authenticated tenant.
    // A foreign tenant's game is treated as not found (no existence leak).
    game = await prisma.game.findFirst({
      where: { id: params.id, tenantId },
    });
  } catch {
    notFound();
  }
  if (!game) notFound();

  return (
    <div>
      <h1 className="platform-display mb-6">Edit Game</h1>
      <div className="max-w-2xl">
        <GameForm
          mode="edit"
          game={{
            ...game,
            createdAt: game.createdAt.toISOString(),
            updatedAt: game.updatedAt.toISOString(),
          }}
        />
      </div>
    </div>
  );
}
