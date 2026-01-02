import React, { useMemo, useState } from "react";
import { useGameStore } from "../../state/useGameStore";
import { Player } from "../../core/models/people";
import { calculateOverall, formatPosition, getAttributeColorClass } from "../../core/utils/playerUtils";
import { PlayerDetailModal } from "../components/PlayerDetailModal";
import { Users, Filter } from "lucide-react";

export const SquadScreen: React.FC = () => {
    const { players, contracts, playerStates, meta } = useGameStore();
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

    const squadList = useMemo(() => {
        if (!meta.userClubId) return [];

        return Object.values(contracts)
            .filter(c => c.clubId === meta.userClubId && c.active)
            .map(contract => {
                const player = players[contract.playerId];
                const state = playerStates[contract.playerId];

                if (!player) return null;

                return {
                    ...player,
                    overall: calculateOverall(player),
                    state: state || { fitness: 100, morale: 80, matchReadiness: 100 },
                    wage: contract.monthlyWage
                };
            })
            .filter((p): p is (Player & { overall: number, state: any, wage: number }) => p !== null)
            .sort((a, b) => b.overall - a.overall);
    }, [contracts, players, playerStates, meta.userClubId]);

    const selectedPlayer = selectedPlayerId ? players[selectedPlayerId] : null;
    const selectedPlayerState = selectedPlayerId ? playerStates[selectedPlayerId] : null;

    if (!meta.userClubId) {
        return <div className="p-8 text-text-muted">Erro: Nenhum clube selecionado.</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-background-secondary p-6 rounded-lg border border-background-tertiary shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center">
                        <Users className="mr-3 text-primary" />
                        Elenco Principal
                    </h1>
                    <p className="text-text-secondary text-sm mt-1">
                        {squadList.length} jogadores registados
                    </p>
                </div>

                <button className="flex items-center px-4 py-2 bg-background border border-background-tertiary rounded text-sm text-text-secondary hover:text-text-primary transition-colors">
                    <Filter size={16} className="mr-2" />
                    Filtrar
                </button>
            </div>

            <div className="bg-background-secondary rounded-lg border border-background-tertiary shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-background-tertiary/50 border-b border-background-tertiary text-xs uppercase tracking-wider text-text-secondary">
                                <th className="p-4 font-semibold">Nome</th>
                                <th className="p-4 font-semibold w-24">Pos</th>
                                <th className="p-4 font-semibold w-20 text-center">Idade</th>
                                <th className="p-4 font-semibold w-20 text-center">OVR</th>
                                <th className="p-4 font-semibold w-32 text-center">Condição</th>
                                <th className="p-4 font-semibold w-32 text-center">Moral</th>
                                <th className="p-4 font-semibold text-right">Salário</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-background-tertiary/50">
                            {squadList.map((player) => (
                                <tr
                                    key={player.id}
                                    onClick={() => setSelectedPlayerId(player.id)}
                                    className="hover:bg-background-tertiary/40 cursor-pointer transition-colors group"
                                >
                                    <td className="p-4">
                                        <div className="font-medium text-text-primary group-hover:text-primary transition-colors">
                                            {player.name}
                                        </div>
                                        <div className="text-xs text-text-muted hidden md:block">
                                            {player.nickname || "Sem apelido"}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="inline-block px-2 py-1 bg-background border border-background-tertiary rounded text-xs font-mono text-text-secondary">
                                            {player.primaryPositionId}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center text-text-secondary">
                                        {new Date().getFullYear() - new Date(player.birthDate).getFullYear()}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className={`font-bold ${getAttributeColorClass(player.overall)}`}>
                                            {player.overall}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <div className="w-16 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${player.state.fitness > 80 ? 'bg-status-success' : player.state.fitness > 50 ? 'bg-status-warning' : 'bg-status-danger'}`}
                                                    style={{ width: `${player.state.fitness}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-text-muted w-6">{player.state.fitness}%</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`${player.state.morale > 70 ? 'text-status-success' : 'text-text-secondary'}`}>
                                            {player.state.morale > 80 ? "Excelente" : player.state.morale > 50 ? "Bom" : "Baixo"}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-mono text-text-secondary text-sm">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(player.wage)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <PlayerDetailModal
                isOpen={!!selectedPlayerId}
                onClose={() => setSelectedPlayerId(null)}
                player={selectedPlayer}
                playerState={selectedPlayerState}
            />
        </div>
    );
};