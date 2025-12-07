import { useEffect, useState } from "react";
import type {
  Competition,
  CompetitionStanding,
  Team,
} from "../../domain/models";
import { Logger } from "../../lib/Logger";

const logger = new Logger("StandingsPage");

interface PlayerStatRow {
  id: number;
  name: string;
  teamName: string;
  goals: number;
  matches: number;
}

interface StandingData extends CompetitionStanding {
  team: Team | null;
}

interface RawStandingData {
  teamId: number;
  groupName?: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  team: Team | null;
}

interface GroupStanding {
  teamId: number;
  groupName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  team: Team | null;
}

function StandingsPage() {
  const [activeTab, setActiveTab] = useState<"table" | "stats">("table");
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<number | null>(null);
  const [standings, setStandings] = useState<StandingData[]>([]);
  const [groupStandings, setGroupStandings] = useState<
    Record<string, GroupStanding[]>
  >({});
  const [topScorers, setTopScorers] = useState<PlayerStatRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  const currentSeasonId = 1;

  useEffect(() => {
    const loadComps = async () => {
      try {
        const api = window.electronAPI;
        const comps = await api.getCompetitions();
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
        const selectedComp = competitions.find((c) => c.id === selectedCompId);

        if (activeTab === "table") {
          const data = await api.getStandings(selectedCompId, currentSeasonId);

          if (selectedComp?.type === "group_knockout") {
            const grouped: Record<string, GroupStanding[]> = {};

            data.forEach((standing: RawStandingData) => {
              const groupName = standing.groupName || "A";
              if (!grouped[groupName]) {
                grouped[groupName] = [];
              }

              grouped[groupName].push({
                teamId: standing.teamId,
                groupName: standing.groupName || "A",
                played: standing.played || 0,
                wins: standing.wins || 0,
                draws: standing.draws || 0,
                losses: standing.losses || 0,
                goalsFor: standing.goalsFor || 0,
                goalsAgainst: standing.goalsAgainst || 0,
                goalDifference:
                  (standing.goalsFor || 0) - (standing.goalsAgainst || 0),
                points: standing.points || 0,
                team: standing.team,
              });
            });

            Object.keys(grouped).forEach((groupName) => {
              grouped[groupName].sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.goalDifference !== a.goalDifference)
                  return b.goalDifference - a.goalDifference;
                return b.goalsFor - a.goalsFor;
              });
            });

            setGroupStandings(grouped);
            setStandings([]);

            if (Object.keys(grouped).length > 0 && selectedGroup === "all") {
              setSelectedGroup(Object.keys(grouped)[0]);
            }
          } else {
            setStandings(data);
            setGroupStandings({});
          }
        } else {
          const data = await api.getTopScorers(selectedCompId, currentSeasonId);
          setTopScorers(data);
        }
      } catch (error) {
        logger.error("Erro ao carregar dados da competição", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedCompId, activeTab, currentSeasonId, competitions, selectedGroup]);

  const selectedComp = competitions.find((c) => c.id === selectedCompId);
  const isGroupCompetition = selectedComp?.type === "group_knockout";
  const hasGroups = Object.keys(groupStandings).length > 0;

  return (
    <div className="p-8 pb-20">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-light text-white mb-1">Competições</h2>
          <p className="text-slate-400 text-sm">Classificação e Estatísticas</p>
        </div>

        <div className="flex gap-2">
          {competitions.map((comp) => (
            <button
              key={comp.id}
              onClick={() => {
                setSelectedCompId(comp.id);
                setSelectedGroup("all");
              }}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                selectedCompId === comp.id
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
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "table"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          {isGroupCompetition ? "Fase de Grupos" : "Tabela Classificativa"}
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "stats"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Estatísticas de Jogadores
        </button>
      </div>

      {activeTab === "table" && hasGroups && (
        <div className="mb-6 flex gap-2">
          {Object.keys(groupStandings)
            .sort()
            .map((groupName) => (
              <button
                key={groupName}
                onClick={() => setSelectedGroup(groupName)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedGroup === groupName
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                Grupo {groupName}
              </button>
            ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <>
          {activeTab === "table" && hasGroups && (
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
              <div className="bg-slate-950/50 p-4 border-b border-slate-800">
                <h3 className="text-lg font-semibold text-emerald-400">
                  Grupo {selectedGroup}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Os 2 primeiros colocados avançam para as oitavas de final
                </p>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-900 text-slate-400 font-semibold uppercase text-xs">
                  <tr>
                    <th className="p-4 w-12 text-center">#</th>
                    <th className="p-4">Clube</th>
                    <th className="p-4 text-center">J</th>
                    <th className="p-4 text-center">V</th>
                    <th className="p-4 text-center">E</th>
                    <th className="p-4 text-center">D</th>
                    <th className="p-4 text-center">GP</th>
                    <th className="p-4 text-center">GC</th>
                    <th className="p-4 text-center">SG</th>
                    <th className="p-4 text-center font-bold text-white">
                      PTS
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {groupStandings[selectedGroup]?.map((row, index) => (
                    <tr key={row.teamId} className="hover:bg-slate-800/50">
                      <td
                        className={`p-4 text-center font-mono ${
                          index < 2
                            ? "text-emerald-400 border-l-2 border-l-emerald-500"
                            : "text-slate-500"
                        }`}
                      >
                        {index + 1}
                      </td>
                      <td className="p-4 font-medium text-white">
                        {row.team?.name || "Time Desconhecido"}
                      </td>
                      <td className="p-4 text-center text-slate-300">
                        {row.played}
                      </td>
                      <td className="p-4 text-center text-slate-400">
                        {row.wins}
                      </td>
                      <td className="p-4 text-center text-slate-400">
                        {row.draws}
                      </td>
                      <td className="p-4 text-center text-slate-400">
                        {row.losses}
                      </td>
                      <td className="p-4 text-center text-slate-400">
                        {row.goalsFor}
                      </td>
                      <td className="p-4 text-center text-slate-400">
                        {row.goalsAgainst}
                      </td>
                      <td className="p-4 text-center text-slate-400">
                        {row.goalDifference}
                      </td>
                      <td className="p-4 text-center font-bold text-emerald-400 text-base">
                        {row.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!groupStandings[selectedGroup] ||
                groupStandings[selectedGroup].length === 0) && (
                <div className="p-8 text-center text-slate-500">
                  Nenhuma classificação disponível para este grupo.
                </div>
              )}
            </div>
          )}

          {activeTab === "table" && !hasGroups && (
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-900 text-slate-400 font-semibold uppercase text-xs">
                  <tr>
                    <th className="p-4 w-12 text-center">#</th>
                    <th className="p-4">Clube</th>
                    <th className="p-4 text-center">J</th>
                    <th className="p-4 text-center">V</th>
                    <th className="p-4 text-center">E</th>
                    <th className="p-4 text-center">D</th>
                    <th className="p-4 text-center">GP</th>
                    <th className="p-4 text-center">GC</th>
                    <th className="p-4 text-center">SG</th>
                    <th className="p-4 text-center font-bold text-white">
                      PTS
                    </th>
                    <th className="p-4 w-24 text-center">Forma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {standings.map((row, index) => (
                    <tr key={row.id} className="hover:bg-slate-800/50">
                      <td
                        className={`p-4 text-center font-mono ${
                          index < 4
                            ? "text-blue-400 border-l-2 border-l-blue-500"
                            : index > standings.length - 4
                            ? "text-red-400 border-l-2 border-l-red-500"
                            : "text-slate-500"
                        }`}
                      >
                        {index + 1}
                      </td>
                      <td className="p-4 font-medium text-white">
                        {row.team?.name || "Time Desconhecido"}
                      </td>
                      <td className="p-4 text-center text-slate-300">
                        {row.played}
                      </td>
                      <td className="p-4 text-center text-slate-400">
                        {row.wins}
                      </td>
                      <td className="p-4 text-center text-slate-400">
                        {row.draws}
                      </td>
                      <td className="p-4 text-center text-slate-400">
                        {row.losses}
                      </td>
                      <td className="p-4 text-center text-slate-400">
                        {row.goalsFor}
                      </td>
                      <td className="p-4 text-center text-slate-400">
                        {row.goalsAgainst}
                      </td>
                      <td className="p-4 text-center text-slate-400">
                        {(row.goalsFor || 0) - (row.goalsAgainst || 0)}
                      </td>
                      <td className="p-4 text-center font-bold text-emerald-400 text-base">
                        {row.points}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {standings.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  Nenhuma classificação disponível para esta competição.
                </div>
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
                    <th className="p-4 text-center font-bold text-white">
                      Gols
                    </th>
                    <th className="p-4 text-center">Média</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {topScorers.map((player, index) => (
                    <tr key={index} className="hover:bg-slate-800/50">
                      <td className="p-4 text-center text-slate-500 font-mono">
                        {index + 1}
                      </td>
                      <td className="p-4 font-medium text-white">
                        {player.name}
                      </td>
                      <td className="p-4 text-slate-400">{player.teamName}</td>
                      <td className="p-4 text-center text-slate-400">
                        {player.matches}
                      </td>
                      <td className="p-4 text-center font-bold text-emerald-400">
                        {player.goals}
                      </td>
                      <td className="p-4 text-center text-slate-500">
                        {(player.goals / (player.matches || 1)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {topScorers.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  Nenhuma estatística disponível.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default StandingsPage;
