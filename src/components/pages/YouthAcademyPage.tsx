import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logger } from "../../lib/Logger";
import type { Player } from "../../domain/models";
import Badge from "../common/Badge";
import { LoadingSpinner } from "../common/Loading";
import { EmptyState } from "../common/EmptyState";

const logger = new Logger("YouthAcademyPage");

export default function YouthAcademyPage({ teamId }: { teamId: number }) {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPlayers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.youth.getPlayers(teamId);
            setPlayers(data);
        } catch (error) {
            logger.error("Erro ao buscar base:", error);
        } finally {
            setLoading(false);
        }
    }, [teamId]);

    useEffect(() => {
        fetchPlayers();
    }, [fetchPlayers]);

    const handlePromote = async (player: Player) => {
        if (!confirm(`Deseja promover ${player.firstName} ${player.lastName} para o time principal?`)) return;

        try {
            const success = await window.electronAPI.youth.promote(player.id, teamId);
            if (success) {
                alert("Jogador promovido com sucesso!");
                fetchPlayers();
            } else {
                alert("Falha ao promover jogador. Verifique o limite do elenco.");
            }
        } catch (error) {
            logger.error("Erro na promoção:", error);
        }
    };

    const handleRelease = async (player: Player) => {
        if (!confirm(`Tem certeza que deseja dispensar ${player.lastName}? Esta ação é irreversível.`)) return;

        try {
            const success = await window.electronAPI.youth.release(player.id, teamId);
            if (success) {
                fetchPlayers();
            }
        } catch (error) {
            logger.error("Erro ao dispensar:", error);
        }
    };

    if (loading) {
        return <LoadingSpinner size="md" centered={true} />;
    }

    return (
        <div className="p-8 pb-20">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-light text-white mb-1">Categorias de Base</h2>
                    <p className="text-slate-400 text-sm">Desenvolva o futuro do clube.</p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-slate-400">Jovens Talentos</div>
                    <div className="text-2xl font-bold text-white">{players.length}</div>
                </div>
            </header>

            {players.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-lg">
                    <EmptyState
                        icon={<span className="text-4xl">🎓</span>}
                        title="Academia Vazia"
                        description="Nenhum jogador na base no momento. Aguarde a próxima 'Peneira' anual para revelar novos talentos."
                    />
                </div>
            ) : (
                <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                        {players.map(player => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                key={player.id}
                                className="bg-slate-900 border border-slate-800 rounded-lg p-5 hover:border-emerald-500/50 transition-all group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{player.firstName} {player.lastName}</h3>
                                        <div className="flex gap-2 mt-1">
                                            <Badge variant="neutral" className="text-xs">{player.position}</Badge>
                                            <span className="text-xs text-slate-400 self-center">{player.age} anos</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-500 uppercase">Overall</div>
                                        <div className="text-2xl font-bold text-emerald-400">{player.overall}</div>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Potencial Estimado</span>
                                        <span className="text-yellow-400 font-bold">{player.potential}</span>
                                    </div>
                                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                                        <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (player.potential / 99) * 100)}%` }}></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mt-2">
                                        <div>Fin: {player.finishing}</div>
                                        <div>Pas: {player.passing}</div>
                                        <div>Vel: {player.pace}</div>
                                        <div>Fís: {player.physical}</div>
                                    </div>
                                </div>

                                <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handlePromote(player)}
                                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-bold transition-colors"
                                    >
                                        Promover
                                    </button>
                                    <button
                                        onClick={() => handleRelease(player)}
                                        className="px-3 py-2 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-800 rounded transition-colors"
                                        title="Dispensar"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    );
}