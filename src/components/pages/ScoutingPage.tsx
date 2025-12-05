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
        firstName: string;
        lastName: string;
    } | null;
}

function ScoutingPage({ teamId }: { teamId: number }) {
    const [activeTab, setActiveTab] = useState<"staff" | "reports">("staff");
    const [scouts, setScouts] = useState<Staff[]>([]);
    const [reports, setReports] = useState<ScoutingEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const allStaff = await window.electronAPI.getStaff(teamId);
                const scoutStaff = allStaff.filter((s: Staff) => s.role === "scout");
                setScouts(scoutStaff);

                // Carregar Lista de Observação (Nota: precisas implementar getScoutingList no main)
                // const reportList = await window.electronAPI.getScoutingList(teamId);
                // setReports(reportList || []);

                // MOCK TEMPORÁRIO PARA DEMONSTRAÇÃO VISUAL
                setReports([
                    {
                        id: 1,
                        progress: 45,
                        lastUpdate: "2025-01-20",
                        player: { id: 99, firstName: "Jovem", lastName: "Promessa", position: "FW", age: 17, teamId: 2 },
                        scout: scoutStaff[0] || { firstName: "Olheiro", lastName: "Teste" }
                    }
                ]);

            } catch (error) {
                logger.error("Erro ao carregar scouting:", error);
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
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${activeTab === "staff" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                            }`}
                    >
                        Olheiros
                    </button>
                    <button
                        onClick={() => setActiveTab("reports")}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${activeTab === "reports" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                            }`}
                    >
                        Relatórios
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="text-center p-10 text-slate-500">A carregar...</div>
            ) : (
                <>
                    {activeTab === "staff" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {scouts.length === 0 && <p className="text-slate-500">Nenhum olheiro contratado.</p>}
                            {scouts.map(scout => (
                                <div key={scout.id} className="bg-slate-900 border border-slate-800 p-6 rounded-lg flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-xl">
                                        🕵️
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">{scout.firstName} {scout.lastName}</h3>
                                        <p className="text-xs text-slate-400">{formatRole(scout.role)}</p>
                                        <div className="mt-2 flex gap-4 text-sm">
                                            <span className="text-slate-300">Overall: <strong className="text-emerald-400">{scout.overall}</strong></span>
                                            <span className="text-slate-300">Área: {scout.specialization || "Geral"}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === "reports" && (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
                                    <tr>
                                        <th className="p-4">Jogador</th>
                                        <th className="p-4">Posição</th>
                                        <th className="p-4">Idade</th>
                                        <th className="p-4">Conhecimento</th>
                                        <th className="p-4">Olheiro Resp.</th>
                                        <th className="p-4">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {reports.map(report => (
                                        <tr key={report.id} className="hover:bg-slate-800/50">
                                            <td className="p-4 font-medium text-slate-200">
                                                {report.player.firstName} {report.player.lastName}
                                            </td>
                                            <td className="p-4 text-slate-400">{report.player.position}</td>
                                            <td className="p-4 text-slate-400">{report.player.age}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-500"
                                                            style={{ width: `${report.progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-slate-500">{report.progress}%</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-400">
                                                {report.scout ? `${report.scout.firstName} ${report.scout.lastName}` : "Nenhum"}
                                            </td>
                                            <td className="p-4">
                                                <button className="text-emerald-400 hover:text-emerald-300 text-xs font-bold uppercase">
                                                    Ver Detalhes
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default ScoutingPage;