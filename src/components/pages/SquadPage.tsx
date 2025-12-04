import { useEffect, useState } from "react";
import PlayerTable from "../features/squad/PlayerTable";
import type { Player } from "../../domain/models";

function SquadPage({ teamId }: { teamId: number }) {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlayers = async () => {
            setLoading(true);
            try {
                const data = await window.electronAPI.getPlayers(teamId);
                const sorted = data.sort((a: Player, b: Player) => b.overall - a.overall);
                setPlayers(sorted);
            } catch (error) {
                console.error("Erro ao buscar jogadores:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPlayers();
    }, [teamId]);

    return (
        <div className="p-8">
            <header className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-light text-white mb-1">Elenco Principal</h2>
                    <p className="text-slate-400 text-sm">
                        {players.length} Jogadores Registrados
                    </p>
                </div>

                <div className="flex gap-2">
                    <button className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded border border-slate-700">Todos</button>
                    <button className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-xs rounded border border-slate-800 text-slate-400">Titulares</button>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center p-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
            ) : (
                <PlayerTable players={players} />
            )}
        </div>
    );
}

export default SquadPage;