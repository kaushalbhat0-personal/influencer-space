import { notFound } from "next/navigation";
import { GameService } from "@/services/games.service";
import { GameForm } from "../../_components/games-form";

export default async function EditGamePage({
  params,
}: {
  params: { id: string };
}) {
  const game = await GameService.findById(params.id);
  if (!game) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Edit Game</h1>
      <div className="max-w-lg">
        <GameForm mode="edit" game={game} />
      </div>
    </div>
  );
}
