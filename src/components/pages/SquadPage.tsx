import { useEffect, useState, useMemo } from "react";
import PlayerTable from "../features/squad/PlayerTable";
import type { Player } from "../../domain/models";
import { Logger } from "../../lib/Logger";

type FilterType = "all" | "starters";

const logger = new Logger("SquadPage");

function SquadPage({ teamId }: { teamId: number }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await window.electronAPI.player.getPlayers(teamId);
        const sorted = data.sort(
          (a: Player, b: Player) => b.overall - a.overall
        );
        setPlayers(sorted);
      } catch (err) {
        logger.error("Erro ao buscar jogadores:", err);
        setError("Não foi possível carregar os jogadores. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [teamId]);

  const filteredPlayers = useMemo(() => {
    if (filter === "starters") {
      return players.slice(0, 11);
    }
    return players;
  }, [players, filter]);

  return (
    <div className="p-8">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-light text-white mb-1">
            Elenco Principal
          </h2>
          <p className="text-slate-400 text-sm">
            {filteredPlayers.length} Jogadores{" "}
            {filter === "starters" && "Titulares"}
          </p>
        </div>

        <div
          className="flex gap-2"
          role="group"
          aria-label="Filtros de jogadores"
        >
          <button
            type="button"
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              filter === "all"
                ? "bg-slate-800 hover:bg-slate-700 border-slate-700"
                : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400"
            }`}
          >
            Todos ({players.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("starters")}
            aria-pressed={filter === "starters"}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              filter === "starters"
                ? "bg-slate-800 hover:bg-slate-700 border-slate-700"
                : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400"
            }`}
          >
            Titulares (11)
          </button>
        </div>
      </header>

      {error && (
        <div
          className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6"
          role="alert"
        >
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div
          className="flex justify-center p-10"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            <p className="text-slate-400">A carregar jogadores...</p>
          </div>
        </div>
      ) : (
        <PlayerTable players={filteredPlayers} />
      )}
    </div>
  );
}

export default SquadPage;
