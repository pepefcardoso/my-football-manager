import { useEffect, useState, useMemo } from "react";
import type {
  Competition,
  CompetitionStanding,
  Team,
} from "../../domain/models";
import { Logger } from "../../lib/Logger";
import { TeamLogo } from "../common/TeamLogo";
import { useGameStore } from "../../store/useGameStore";
import { LoadingSpinner } from "../common/Loading";

const logger = new Logger("StandingsPage");

interface StandingData extends CompetitionStanding {
  team: Team | null;
  phase?: string;
  groupName?: string | null;
}

interface GoalkeeperStatRow {
  id: number;
  name: string;
  teamName: string;
  cleanSheets: number;
  saves: number;
  goalsConceded: number;
  matches: number;
}

interface PlayerStatRow {
  id: number;
  name: string;
  teamName: string;
  goals: number;
  assists?: number;
  matches: number;
}

function StandingsPage() {
  const [activeTab, setActiveTab] = useState<"table" | "stats" | "keepers">("table");
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<number | null>(null);

  const [allStandings, setAllStandings] = useState<StandingData[]>([]);

  const [topScorers, setTopScorers] = useState<PlayerStatRow[]>([]);
  const [topGoalkeepers, setTopGoalkeepers] = useState<GoalkeeperStatRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [teamForms, setTeamForms] = useState<Record<number, string[]>>({});

  const [filterPhase, setFilterPhase] = useState<'all' | 'group' | 'knockout' | 'regular'>('all');
  const [filterGroup, setFilterGroup] = useState<string | null>(null);

  const currentSeasonId = 1;

  useEffect(() => {
    const loadComps = async () => {
      try {
        const api = window.electronAPI;
        const comps = await api.competition.getCompetitions();
        setCompetitions(comps);
        if (comps.length > 0) {
          setSelectedCompId(comps[0].id);
        }
      } catch (error) {
        logger.error("Erro ao carregar competições", error);
      }
    };
    loadComps();
  }, []);

  useEffect(() => {
    if (!selectedCompId || !currentSeasonId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const api = window.electronAPI;

        if (activeTab === "table") {
          const data = await api.competition.getStandings(selectedCompId, currentSeasonId);
          setAllStandings(data);
        } else if (activeTab === "keepers") {
          const data = await api.competition.getTopGoalkeepers(selectedCompId, currentSeasonId);
          const enhancedData = await Promise.all(data.map(async (item: any) => {
            return {
              ...item,
              name: item.name || "Goleiro " + item.playerId,
              teamName: item.teamName || "Time",
            };
          }));
          setTopGoalkeepers(enhancedData);
        } else {
          const data = await api.competition.getTopScorers(selectedCompId, currentSeasonId);
          setTopScorers(data);
        }
      } catch (error) {
        logger.error("Erro ao carregar dados da competição", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedCompId, activeTab, currentSeasonId]);

  const selectedComp = competitions.find((c) => c.id === selectedCompId);
  const isGroupCompetition = selectedComp?.type === "group_knockout";

  const availableGroups = useMemo(() => {
    const groups = new Set<string>();
    allStandings.forEach(s => {
      if (s.groupName) groups.add(s.groupName);
    });
    return Array.from(groups).sort();
  }, [allStandings]);

  const filteredStandings = useMemo(() => {
    let result = [...allStandings];

    if (isGroupCompetition) {
      if (filterPhase === 'group') {
        result = result.filter(s => !!s.groupName);

        if (filterGroup && filterGroup !== 'all') {
          result = result.filter(s => s.groupName === filterGroup);
        }
      } else if (filterPhase === 'knockout') {
        result = result.filter(s => !s.groupName || (s as any).phase === 'knockout');
      }
    }

    return result.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      const sgA = (a.goalsFor || 0) - (a.goalsAgainst || 0);
      const sgB = (b.goalsFor || 0) - (b.goalsAgainst || 0);
      if (sgB !== sgA) return sgB - sgA;
      return (b.goalsFor || 0) - (a.goalsFor || 0);
    });
  }, [allStandings, filterPhase, filterGroup, isGroupCompetition]);

  useEffect(() => {
    const loadForms = async () => {
      if (activeTab !== "table" || filteredStandings.length === 0 || !selectedCompId) return;

      const forms: Record<number, string[]> = {};

      const distinctTeamIds = new Set(filteredStandings.map(s => s.teamId));

      await Promise.all(
        Array.from(distinctTeamIds).map(async (teamId) => {
          if (!teamId) return;
          try {
            const form = await window.electronAPI.competition.getTeamForm(
              teamId,
              selectedCompId,
              currentSeasonId
            );
            forms[teamId] = form;
          } catch (error) {
            logger.error(`Erro ao carregar forma do time ${teamId}`, error);
            forms[teamId] = [];
          }
        })
      );

      setTeamForms(forms);
    };

    loadForms();
  }, [filteredStandings, selectedCompId, activeTab, currentSeasonId]);

  return (
    <div className="p-8 pb-20">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-light text-white mb-1">Competições</h2>
          <p className="text-slate-400 text-sm">Classificação e Estatísticas</p>
        </div>

        <div className="flex gap-2 overflow-x-auto max-w-[50%] pb-2">
          {competitions.map((comp) => (
            <button
              key={comp.id}
              onClick={() => {
                setSelectedCompId(comp.id);
                setFilterPhase('all');
                setFilterGroup('all');
              }}
              className={`px-3 py-1 rounded text-sm transition-colors whitespace-nowrap ${selectedCompId === comp.id
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
            >
              {comp.shortName}
            </button>
          ))}
        </div>
      </header>

      <div className="flex mb-6 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("table")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "table"
            ? "border-emerald-500 text-emerald-400"
            : "border-transparent text-slate-400 hover:text-white"
            }`}
        >
          Classificação
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "stats"
            ? "border-emerald-500 text-emerald-400"
            : "border-transparent text-slate-400 hover:text-white"
            }`}
        >
          Artilharia
        </button>
        <button
          onClick={() => setActiveTab("keepers")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "keepers"
            ? "border-emerald-500 text-emerald-400"
            : "border-transparent text-slate-400 hover:text-white"
            }`}
        >
          Goleiros
        </button>
      </div>

      {activeTab === "table" && !loading && (
        <div className="flex gap-4 mb-6 items-center bg-slate-900/50 p-3 rounded-lg border border-slate-800">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtros:</span>

          <div className="relative">
            <select
              value={filterPhase}
              onChange={(e) => {
                setFilterPhase(e.target.value as any);
                if (e.target.value !== 'group') setFilterGroup('all');
              }}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none pr-8 cursor-pointer hover:bg-slate-750"
            >
              <option value="all">Todas as Fases</option>
              {isGroupCompetition && <option value="group">Fase de Grupos</option>}
              {isGroupCompetition && <option value="knockout">Fase Final</option>}
              {!isGroupCompetition && <option value="regular">Temporada Regular</option>}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
          </div>

          {filterPhase === 'group' && availableGroups.length > 0 && (
            <div className="relative animate-in fade-in slide-in-from-left-4 duration-200">
              <select
                value={filterGroup || 'all'}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none pr-8 cursor-pointer hover:bg-slate-750"
              >
                <option value="all">Todos os Grupos</option>
                {availableGroups.map(g => (
                  <option key={g} value={g}>Grupo {g}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <LoadingSpinner size="md" centered={true} />
      ) : (
        <>
          {activeTab === "table" && (
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
              {filteredStandings.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  Nenhuma classificação encontrada para os filtros selecionados.
                </div>
              )}

              {filteredStandings.length > 0 && (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-900 text-slate-400 font-semibold uppercase text-xs">
                    <tr>
                      <th className="p-4 w-12 text-center">#</th>
                      <th className="p-4">Clube</th>
                      {filterPhase !== 'regular' && (!filterGroup || filterGroup === 'all') && (
                        <th className="p-4 text-center">GRP</th>
                      )}
                      <th className="p-4 text-center">J</th>
                      <th className="p-4 text-center">V</th>
                      <th className="p-4 text-center">E</th>
                      <th className="p-4 text-center">D</th>
                      <th className="p-4 text-center">GP</th>
                      <th className="p-4 text-center">GC</th>
                      <th className="p-4 text-center">SG</th>
                      <th className="p-4 text-center font-bold text-white">PTS</th>
                      <th className="p-4 w-24 text-center">Forma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredStandings.map((row, index) => (
                      <tr key={`${row.teamId}-${row.groupName || 'reg'}`} className="hover:bg-slate-800/50 transition-colors">
                        <td className={`p-4 text-center font-mono ${index < 4 ? "text-emerald-400 border-l-2 border-l-emerald-500" :
                          index > filteredStandings.length - 4 ? "text-red-400 border-l-2 border-l-red-500" : "text-slate-500"
                          }`}>
                          {index + 1}
                        </td>
                        <td className="p-4 font-medium text-white">
                          <div className="flex items-center gap-3">
                            <TeamLogo
                              team={row.team}
                              className="w-6 h-6"
                              showShadow={false}
                            />
                            <span className={row.teamId === useGameStore.getState().userTeam?.id ? "text-emerald-400 font-bold" : ""}>
                              {row.team?.name || "Time Desconhecido"}
                            </span>
                          </div>
                        </td>
                        {filterPhase !== 'regular' && (!filterGroup || filterGroup === 'all') && (
                          <td className="p-4 text-center text-slate-500 font-bold">{row.groupName || '-'}</td>
                        )}
                        <td className="p-4 text-center text-slate-300">{row.played}</td>
                        <td className="p-4 text-center text-slate-400">{row.wins}</td>
                        <td className="p-4 text-center text-slate-400">{row.draws}</td>
                        <td className="p-4 text-center text-slate-400">{row.losses}</td>
                        <td className="p-4 text-center text-slate-400">{row.goalsFor}</td>
                        <td className="p-4 text-center text-slate-400">{row.goalsAgainst}</td>
                        <td className="p-4 text-center text-slate-400">{(row.goalsFor || 0) - (row.goalsAgainst || 0)}</td>
                        <td className="p-4 text-center font-bold text-emerald-400 text-base">{row.points}</td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-1">
                            {(teamForms[row.teamId!] || []).map((result, i) => (
                              <span
                                key={i}
                                title={result === "W" ? "Vitória" : result === "D" ? "Empate" : "Derrota"}
                                className={`w-2 h-2 rounded-full ${result === "W" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" :
                                  result === "D" ? "bg-slate-500" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                                  }`}
                              />
                            ))}
                            {(!teamForms[row.teamId!] || teamForms[row.teamId!].length === 0) && (
                              <span className="text-slate-600 text-xs">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "stats" && (
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-900 text-slate-400 font-semibold uppercase text-xs">
                  <tr>
                    <th className="p-4 w-12 text-center">#</th>
                    <th className="p-4">Jogador</th>
                    <th className="p-4">Clube</th>
                    <th className="p-4 text-center">Jogos</th>
                    <th className="p-4 text-center font-bold text-white">Gols</th>
                    <th className="p-4 text-center text-emerald-400">Assis.</th>
                    <th className="p-4 text-center">Média</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {topScorers.map((player, index) => (
                    <tr key={index} className="hover:bg-slate-800/50">
                      <td className="p-4 text-center text-slate-500 font-mono">{index + 1}</td>
                      <td className="p-4 font-medium text-white">{player.name}</td>
                      <td className="p-4 text-slate-400">{player.teamName}</td>
                      <td className="p-4 text-center text-slate-400">{player.matches}</td>
                      <td className="p-4 text-center font-bold text-white">{player.goals}</td>
                      <td className="p-4 text-center text-emerald-400 font-mono">{player.assists || 0}</td>
                      <td className="p-4 text-center text-slate-500">{(player.goals / (player.matches || 1)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "keepers" && (
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-900 text-slate-400 font-semibold uppercase text-xs">
                  <tr>
                    <th className="p-4 w-12 text-center">#</th>
                    <th className="p-4">Jogador</th>
                    <th className="p-4">Clube</th>
                    <th className="p-4 text-center">Jogos</th>
                    <th className="p-4 text-center font-bold text-white" title="Jogos sem sofrer gols">Clean Sheets</th>
                    <th className="p-4 text-center text-emerald-400">Defesas</th>
                    <th className="p-4 text-center text-red-400">Gols Sofridos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {topGoalkeepers.map((keeper, index) => (
                    <tr key={index} className="hover:bg-slate-800/50">
                      <td className="p-4 text-center text-slate-500 font-mono">{index + 1}</td>
                      <td className="p-4 font-medium text-white">{keeper.name}</td>
                      <td className="p-4 text-slate-400">{keeper.teamName}</td>
                      <td className="p-4 text-center text-slate-400">{keeper.matches}</td>
                      <td className="p-4 text-center font-bold text-white">{keeper.cleanSheets}</td>
                      <td className="p-4 text-center text-emerald-400 font-mono">{keeper.saves}</td>
                      <td className="p-4 text-center text-red-400 font-mono">{keeper.goalsConceded}</td>
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

export default StandingsPage;