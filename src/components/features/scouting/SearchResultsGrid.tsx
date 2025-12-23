import type { Player } from "../../../domain/models";
import type { ScoutedPlayerView } from "../../../domain/factories/ReportFactory";
import Badge from "../../common/Badge";

interface SearchResultsGridProps {
    players: (Player | ScoutedPlayerView)[];
    loading: boolean;
    onPlayerClick: (player: Player) => void;
}

export function SearchResultsGrid({ players, loading, onPlayerClick }: SearchResultsGridProps) {
    if (loading) {
        return (
            <div className="flex justify-center p-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (players.length === 0) {
        return (
            <div className="text-center p-12 text-slate-500 bg-slate-900/30 rounded-lg border border-slate-800">
                <p className="text-lg mb-2">Nenhum jogador encontrado.</p>
                <p className="text-sm">Configure seus Slots de Scouting para começar a buscar talentos.</p>
            </div>
        );
    }

    const renderAttr = (player: any, key: string) => {
        if ('visibleAttributes' in player) {
            const attr = player.visibleAttributes[key];
            if (!attr) return "??";
            return attr.isExact ? attr.value : <span className="text-slate-400 tracking-tighter">{attr.value}</span>;
        }
        return player[key];
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((player) => {
                const isScouted = 'visibleAttributes' in player;

                return (
                    <div
                        key={player.id}
                        onClick={() => onPlayerClick(player)}
                        className="group bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-lg p-4 cursor-pointer transition-all"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                                    {player.firstName} {player.lastName}
                                </h4>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {player.position} • {player.age} anos • {player.nationality}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-white bg-slate-950 px-2 py-1 rounded border border-slate-700">
                                    {renderAttr(player, 'overall')} <span className="text-[10px] text-slate-500 uppercase">OVR</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                            <div className="bg-slate-950/50 p-1.5 rounded text-center">
                                <span className="block text-slate-500 text-[10px]">PAC</span>
                                <span className="font-mono text-slate-300">{renderAttr(player, 'pace')}</span>
                            </div>
                            <div className="bg-slate-950/50 p-1.5 rounded text-center">
                                <span className="block text-slate-500 text-[10px]">SHO</span>
                                <span className="font-mono text-slate-300">{renderAttr(player, 'shooting')}</span>
                            </div>
                            <div className="bg-slate-950/50 p-1.5 rounded text-center">
                                <span className="block text-slate-500 text-[10px]">PAS</span>
                                <span className="font-mono text-slate-300">{renderAttr(player, 'passing')}</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-800/50">
                            {isScouted && (player as ScoutedPlayerView).scoutingStatus.progress < 100 ? (
                                <Badge variant="warning" className="text-[10px]">
                                    🔍 {(player as ScoutedPlayerView).scoutingStatus.progress}% Obs.
                                </Badge>
                            ) : (
                                <Badge variant="success" className="text-[10px]">Conhecido</Badge>
                            )}
                            <span className="text-xs text-emerald-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                Ver Detalhes →
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}