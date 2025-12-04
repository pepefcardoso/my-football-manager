import { formatCurrency, getPositionColor } from "../../domain/helpers";
import type { Player } from "../../domain/types";

function PlayerTable({ players }: { players: Player[] }) {
    if (players.length === 0) {
        return <div className="text-slate-500 p-4">Nenhum jogador encontrado.</div>;
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-xs uppercase font-semibold text-slate-400">
                    <tr>
                        <th className="p-4">Nome</th>
                        <th className="p-4">Pos</th>
                        <th className="p-4 text-center">Idade</th>
                        <th className="p-4 text-center">OVR</th>
                        <th className="p-4 text-center">POT</th>
                        <th className="p-4 w-32">Condição</th>
                        <th className="p-4 text-center">Moral</th>
                        <th className="p-4 text-right">Salário</th>
                        <th className="p-4 text-center">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {players.map((player) => (
                        <tr key={player.id} className="hover:bg-slate-800/50 transition-colors group">
                            <td className="p-4 font-medium text-slate-200">
                                {player.firstName} {player.lastName}
                                {player.isCaptain && <span className="ml-2 text-yellow-500 text-xs" title="Capitão">©</span>}
                            </td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold border ${getPositionColor(player.position)}`}>
                                    {player.position}
                                </span>
                            </td>
                            <td className="p-4 text-center text-slate-400">{player.age}</td>
                            <td className="p-4 text-center font-bold text-white bg-slate-800/30 rounded">
                                {player.overall}
                            </td>
                            <td className="p-4 text-center text-slate-400 opacity-70">
                                {player.potential}
                            </td>
                            <td className="p-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2" title="Energia">
                                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${player.energy > 80 ? 'bg-emerald-500' : player.energy > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                style={{ width: `${player.energy}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2" title="Forma Física">
                                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500"
                                                style={{ width: `${player.fitness}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4 text-center">
                                <span className={`${player.moral >= 80 ? 'text-emerald-400' : player.moral < 50 ? 'text-red-400' : 'text-yellow-400'}`}>
                                    {player.moral}%
                                </span>
                            </td>
                            <td className="p-4 text-right text-slate-300 font-mono text-xs">
                                {formatCurrency(player.salary || 0)}
                            </td>
                            <td className="p-4 text-center">
                                <div className="flex justify-center gap-2">
                                    {player.isInjured && (
                                        <span className="text-red-500 bg-red-500/10 px-2 py-0.5 rounded text-xs font-bold border border-red-500/20" title="Lesionado">
                                            LES
                                        </span>
                                    )}
                                    {player.suspensionGamesRemaining && player.suspensionGamesRemaining > 0 ? (
                                        <span className="text-red-500 bg-red-500/10 px-2 py-0.5 rounded text-xs font-bold border border-red-500/20" title="Suspenso">
                                            SUS
                                        </span>
                                    ) : null}
                                    {player.isYouth && (
                                        <span className="text-cyan-400 text-xs" title="Base">🎓</span>
                                    )}
                                    {!player.isInjured && (!player.suspensionGamesRemaining || player.suspensionGamesRemaining === 0) && (
                                        <span className="text-emerald-500 text-xs">OK</span>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default PlayerTable;