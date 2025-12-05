import { useEffect, useState } from "react";
import { formatRole } from "../../utils/formatters";
import type { Staff } from "../../domain/models";
import { Logger } from "../../lib/Logger";

const logger = new Logger("ScoutingPage");

interface ScoutingEntry {
    id: number;
    progress: number;
    lastUpdate: string;
    player: {
        id: number;
        firstName: string;
        lastName: string;
        position: string;
        age: number;
        teamId: number;
    };
    scout: {
        id: number;
        firstName: string;
        lastName: string;
    } | null;
}

function ScoutingPage({ teamId }: { teamId: number }) {
    const [activeTab, setActiveTab] = useState<"staff" | "reports">("staff");
    const [scouts, setScouts] = useState<Staff[]>([]);
    const [reports, setReports] = useState<ScoutingEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);

            try {
                const allStaff = await window.electronAPI.getStaff(teamId);
                const scoutStaff = allStaff.filter((s: Staff) => s.role === "scout");
                setScouts(scoutStaff);

                const reportList = await window.electronAPI.getScoutingList(teamId);

                const transformedReports: ScoutingEntry[] = reportList.map((report: any) => ({
                    id: report.id,
                    progress: report.progress || 0,
                    lastUpdate: report.date || "Nunca",
                    player: {
                        id: report.player.id,
                        firstName: report.player.firstName,
                        lastName: report.player.lastName,
                        position: report.player.position,
                        age: report.player.age,
                        teamId: report.player.teamId || 0,
                    },
                    scout: report.scout ? {
                        id: report.scout.id,
                        firstName: report.scout.firstName,
                        lastName: report.scout.lastName,
                    } : null,
                }));

                setReports(transformedReports);

                logger.info(`Scouting carregado: ${scoutStaff.length} olheiros, ${transformedReports.length} relatórios`);

            } catch (err) {
                logger.error("Erro ao carregar scouting:", err);
                setError("Não foi possível carregar os dados de scouting.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [teamId]);

    return (
        <div className="p-8">
            <header className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-light text-white mb-1">Rede de Scouting</h2>
                    <p className="text-slate-400 text-sm">Gestão de Olheiros e Observações</p>
                </div>

                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                    <button
                        onClick={() => setActiveTab("staff")}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${activeTab === "staff"
                            ? "bg-slate-700 text-white"
                            : "text-slate-400 hover:text-white"
                            }`}
                    >
                        Olheiros
                    </button>
                    <button
                        onClick={() => setActiveTab("reports")}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${activeTab === "reports"
                            ? "bg-slate-700 text-white"
                            : "text-slate-400 hover:text-white"
                            }`}
                    >
                        Relatórios ({reports.length})
                    </button>
                </div>
            </header>

            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
                    ⚠️ {error}
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center p-10 text-slate-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-4"></div>
                    <p>A carregar dados de scouting...</p>
                </div>
            ) : (
                <>
                    {activeTab === "staff" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {scouts.length === 0 ? (
                                <div className="col-span-2 text-center p-8 bg-slate-900/50 rounded-lg border border-slate-800">
                                    <p className="text-slate-500 mb-2">Nenhum olheiro contratado.</p>
                                    <p className="text-xs text-slate-600">Contrate olheiros na aba "Equipa Técnica" para começar a observar jogadores.</p>
                                </div>
                            ) : (
                                scouts.map(scout => (
                                    <div
                                        key={scout.id}
                                        className="bg-slate-900 border border-slate-800 p-6 rounded-lg flex items-center gap-4 hover:border-slate-700 transition-colors"
                                    >
                                        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-xl">
                                            🕵️
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-white">
                                                {scout.firstName} {scout.lastName}
                                            </h3>
                                            <p className="text-xs text-slate-400">{formatRole(scout.role)}</p>
                                            <div className="mt-2 flex gap-4 text-sm">
                                                <span className="text-slate-300">
                                                    Overall: <strong className="text-emerald-400">{scout.overall}</strong>
                                                </span>
                                                <span className="text-slate-300">
                                                    Área: {scout.specialization ? formatRole(scout.specialization) : "Geral"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === "reports" && (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
                            {reports.length === 0 ? (
                                <div className="text-center p-8 text-slate-500">
                                    <p className="mb-2">Nenhum jogador em observação.</p>
                                    <p className="text-xs text-slate-600">
                                        Atribua olheiros para começar a observar jogadores de outros clubes.
                                    </p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
                                        <tr>
                                            <th className="p-4">Jogador</th>
                                            <th className="p-4">Posição</th>
                                            <th className="p-4">Idade</th>
                                            <th className="p-4">Conhecimento</th>
                                            <th className="p-4">Olheiro Resp.</th>
                                            <th className="p-4">Última Atualização</th>
                                            <th className="p-4">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {reports.map(report => (
                                            <tr key={report.id} className="hover:bg-slate-800/50 transition-colors">
                                                <td className="p-4 font-medium text-slate-200">
                                                    {report.player.firstName} {report.player.lastName}
                                                </td>
                                                <td className="p-4 text-slate-400">
                                                    <span className="px-2 py-1 rounded bg-slate-800 text-xs">
                                                        {report.player.position}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-slate-400">{report.player.age}</td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full transition-all ${report.progress >= 100
                                                                    ? "bg-emerald-500"
                                                                    : report.progress >= 50
                                                                        ? "bg-yellow-500"
                                                                        : "bg-red-500"
                                                                    }`}
                                                                style={{ width: `${Math.min(100, report.progress)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-slate-500 font-mono">
                                                            {Math.min(100, report.progress)}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-slate-400">
                                                    {report.scout
                                                        ? `${report.scout.firstName} ${report.scout.lastName}`
                                                        : <span className="text-slate-600 italic">Nenhum</span>
                                                    }
                                                </td>
                                                <td className="p-4 text-slate-500 text-xs font-mono">
                                                    {new Date(report.lastUpdate).toLocaleDateString("pt-PT")}
                                                </td>
                                                <td className="p-4">
                                                    <button
                                                        className="text-emerald-400 hover:text-emerald-300 text-xs font-bold uppercase transition-colors"
                                                        onClick={() => {
                                                            logger.info(`Ver detalhes do jogador ${report.player.id}`);
                                                            // TODO: Implementar modal/página de detalhes
                                                        }}
                                                    >
                                                        Ver Detalhes
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default ScoutingPage;