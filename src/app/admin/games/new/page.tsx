import { GameForm } from "../_components/games-form";

export default function NewGamePage() {
  return (
    <div>
      <h1 className="admin-gradient-text mb-6 text-2xl font-bold font-display">Add New Game</h1>
      <div className="max-w-2xl">
        <GameForm mode="create" />
      </div>
    </div>
  );
}
