import { GameForm } from "../_components/games-form";

export default function NewGamePage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Add New Game</h1>
      <div className="max-w-lg">
        <GameForm mode="create" />
      </div>
    </div>
  );
}
