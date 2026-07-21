import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GameForm } from "../../_components/games-form";
import { getTenantContext } from "@/lib/tenant";

export default async function EditGamePage({
  params,
}: {
  params: { id: string };
}) {
  const tenant = await getTenantContext();
  if (!tenant) notFound();

  let game;
  try {
    game = await prisma.game.findUnique({
      where: { id: params.id },
    });
  } catch {
    notFound();
  }
  if (!game) notFound();

  return (
    <div>
      <h1 className="admin-gradient-text mb-6 text-2xl font-bold font-display">Edit Game</h1>
      <div className="max-w-2xl">
        <GameForm mode="edit" game={game} />
      </div>
    </div>
  );
}
