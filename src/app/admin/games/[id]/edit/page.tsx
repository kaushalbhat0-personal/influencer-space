import { notFound } from "next/navigation";
import { GameService } from "@/services/games.service";
import { GameForm } from "../../_components/games-form";

export default async function EditGamePage({
  params,
}: {
  params: { id: string };
}) {
  let game;
  try {
    game = await GameService.findById(params.id);
  } catch {
    notFound();
  }
  if (!game) notFound();

  return (
    <div>
      <h1 className="admin-gradient-text mb-6 text-2xl font-bold font-gaming">Edit Game</h1>
      <div className="max-w-2xl">
        <GameForm mode="edit" game={game} />
      </div>
    </div>
  );
}
