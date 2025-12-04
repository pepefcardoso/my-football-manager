import { useState, useEffect } from "react";
import type { GameState, Player, Staff } from "./domain/types";

type Team = {
  id: number;
  name: string;
  shortName: string;
  primaryColor: string | null;
  reputation: number | null;
  budget: number | null;
};

declare global {
  interface Window {
    electronAPI: {
      getTeams: () => Promise<Team[]>;
      getPlayers: (teamId: number) => Promise<Player[]>;
      getStaff: (teamId: number) => Promise<Staff[]>;
      getGameState: () => Promise<GameState>;
      updateTrainingFocus: (focus: string) => Promise<void>;
      startMatch: (matchId: number) => Promise<boolean>;
      pauseMatch: (matchId: number) => Promise<void>;
      resumeMatch: (matchId: number) => Promise<void>;
      
    };
  }
}

type Page =
  | "menu"
  | "club"
  | "squad"
  | "staff"
  | "youth"
  | "scouting"
  | "finances"
  | "infrastructure"
  | "matches"
  | "calendar";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("menu");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getTeams();
      setTeams(data);
    } catch (error) {
      console.error("Erro ao carregar:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectTeam = (team: Team) => {
    setSelectedTeam(team);
    setCurrentPage("club");
  };

  return (
    <div className="h-screen w-full flex flex-row bg-slate-950 text-white overflow-hidden">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
            FM 2025
          </h1>
          {selectedTeam && (
            <div className="mt-4 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg"
                style={{ backgroundColor: selectedTeam.primaryColor || "#333" }}
              >
                {selectedTeam.shortName.substring(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{selectedTeam.name}</p>
                <p className="text-xs text-slate-500">Reputação: {selectedTeam.reputation}</p>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavButton
            active={currentPage === "menu"}
            onClick={() => setCurrentPage("menu")}
            icon="🏠"
          >
            Menu Principal
          </NavButton>

          {selectedTeam && (
            <>
              <div className="pt-4 pb-2 px-2 text-xs font-semibold text-slate-500 uppercase">
                Gestão
              </div>
              <NavButton
                active={currentPage === "club"}
                onClick={() => setCurrentPage("club")}
                icon="🏛️"
              >
                Visão Geral
              </NavButton>
              <NavButton
                active={currentPage === "squad"}
                onClick={() => setCurrentPage("squad")}
                icon="⚽"
              >
                Elenco Principal
              </NavButton>
              <NavButton
                active={currentPage === "staff"}
                onClick={() => setCurrentPage("staff")}
                icon="👔"
              >
                Equipa Técnica
              </NavButton>
              <NavButton
                active={currentPage === "youth"}
                onClick={() => setCurrentPage("youth")}
                icon="🎓"
              >
                Categorias de Base
              </NavButton>
              <NavButton
                active={currentPage === "scouting"}
                onClick={() => setCurrentPage("scouting")}
                icon="🔍"
              >
                Scouting
              </NavButton>
              <NavButton
                active={currentPage === "finances"}
                onClick={() => setCurrentPage("finances")}
                icon="💰"
              >
                Finanças
              </NavButton>
              <NavButton
                active={currentPage === "infrastructure"}
                onClick={() => setCurrentPage("infrastructure")}
                icon="🏗️"
              >
                Infraestrutura
              </NavButton>

              <div className="pt-4 pb-2 px-2 text-xs font-semibold text-slate-500 uppercase">
                Competição
              </div>
              <NavButton
                active={currentPage === "matches"}
                onClick={() => setCurrentPage("matches")}
                icon="🎮"
              >
                Próximas Partidas
              </NavButton>
              <NavButton
                active={currentPage === "calendar"}
                onClick={() => setCurrentPage("calendar")}
                icon="📅"
              >
                Calendário
              </NavButton>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-500">
            <p>Data: 15 Jan 2025</p>
            <p className="mt-1">Temporada 2024/25</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {currentPage === "menu" && (
          <MenuPage teams={teams} loading={loading} onLoadTeams={loadTeams} onSelectTeam={selectTeam} />
        )}
        {currentPage === "club" && selectedTeam && <ClubOverviewPage team={selectedTeam} />}
        {currentPage === "squad" && selectedTeam && <SquadPage teamId={selectedTeam.id} />}
        {currentPage === "staff" && selectedTeam && <StaffPage teamId={selectedTeam.id} />}
        {currentPage === "youth" && <PlaceholderPage title="Categorias de Base" />}
        {currentPage === "scouting" && <PlaceholderPage title="Scouting" />}
        {currentPage === "finances" && <PlaceholderPage title="Finanças" />}
        {currentPage === "infrastructure" && <PlaceholderPage title="Infraestrutura" />}
        {currentPage === "matches" && <PlaceholderPage title="Próximas Partidas" />}
        {currentPage === "calendar" && <PlaceholderPage title="Calendário" />}
      </main>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-all ${active
        ? "bg-emerald-600 text-white shadow-lg"
        : "text-slate-400 hover:bg-slate-800 hover:text-white"
        }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium">{children}</span>
    </button>
  );
}

function MenuPage({
  teams,
  loading,
  onLoadTeams,
  onSelectTeam,
}: {
  teams: Team[];
  loading: boolean;
  onLoadTeams: () => void;
  onSelectTeam: (team: Team) => void;
}) {
  return (
    <div className="p-8">
      <header className="mb-8">
        <h2 className="text-4xl font-light mb-2">Bem-vindo ao Football Manager</h2>
        <p className="text-slate-400">Escolha seu clube e comece sua jornada</p>
      </header>

      {teams.length === 0 && (
        <button
          onClick={onLoadTeams}
          disabled={loading}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading ? "A carregar..." : "Carregar Clubes"}
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {teams.map((team) => (
          <button
            key={team.id}
            onClick={() => onSelectTeam(team)}
            className="p-6 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500 transition-all text-left group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl shadow-lg"
                style={{ backgroundColor: team.primaryColor || "#333" }}
              >
                {team.shortName}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg group-hover:text-emerald-400 transition-colors">
                  {team.name}
                </h3>
                <p className="text-sm text-slate-500">Rep: {team.reputation}</p>
              </div>
            </div>
            <div className="text-sm text-slate-400">
              Orçamento: €{((team.budget || 0) / 1000000).toFixed(1)}M
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ClubOverviewPage({ team }: { team: Team }) {
  const [gameState, setGameState] = useState<GameState | null>(null);

  const fetchGameState = async () => {
    try {
      const state = await window.electronAPI.getGameState();
      setGameState(state);
    } catch (error) {
      console.error("Erro ao carregar estado do jogo:", error);
    }
  };

  useEffect(() => {
    fetchGameState();
  }, []);

  return (
    <div className="p-8">
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl shadow-lg"
            style={{ backgroundColor: team.primaryColor || "#333" }}
          >
            {team.shortName}
          </div>
          <div>
            <h2 className="text-4xl font-light">{team.name}</h2>
            <p className="text-slate-400">Visão Geral do Clube</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Reputação" value={team.reputation || 0} suffix="/10000" />
        <StatCard
          title="Orçamento"
          value={`€${((team.budget || 0) / 1000000).toFixed(1)}M`}
        />
        <StatCard title="Próxima Partida" value="15 Jan 2025" subtitle="vs Blue Dragons" />
      </div>

      {gameState && (
        <TrainingControl 
          currentFocus={gameState.trainingFocus || "technical"} 
          onUpdate={fetchGameState} 
        />
      )}
    </div>
  );
}

function TrainingControl({ currentFocus, onUpdate }: { currentFocus: string, onUpdate: () => void }) {
  const [saving, setSaving] = useState(false);

  const handleFocusChange = async (focus: string) => {
    setSaving(true);
    await window.electronAPI.updateTrainingFocus(focus);
    onUpdate();
    setSaving(false);
  };

  const focusOptions = [
    { id: "technical", label: "Técnico", icon: "⚽" },
    { id: "tactical", label: "Tático", icon: "📋" },
    { id: "physical", label: "Físico", icon: "💪" },
    { id: "rest", label: "Descanso", icon: "🛌" },
  ];

  return (
    <div className="bg-slate-900 rounded-lg p-6 border border-slate-800 mt-6">
      <h3 className="text-sm font-medium text-slate-400 mb-4">Foco do Treino (Próximo Dia)</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {focusOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handleFocusChange(opt.id)}
            disabled={saving}
            className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
              currentFocus === opt.id
                ? "bg-emerald-600/20 border-emerald-500 text-white"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
            }`}
          >
            <span className="text-2xl">{opt.icon}</span>
            <span className="text-sm font-medium">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

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

function StaffPage({ teamId }: { teamId: number }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      setLoading(true);
      try {
        const data = await window.electronAPI.getStaff(teamId);
        const sorted = data.sort((a: Staff, b: Staff) => a.role.localeCompare(b.role));
        setStaff(sorted);
      } catch (error) {
        console.error("Erro ao buscar staff:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [teamId]);

  return (
    <div className="p-8">
      <header className="mb-6">
        <h2 className="text-3xl font-light text-white mb-1">Equipa Técnica</h2>
        <p className="text-slate-400 text-sm">
          Profissionais e Direção
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center p-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <StaffTable staff={staff} />
      )}
    </div>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-8">
      <header className="mb-8">
        <h2 className="text-3xl font-light mb-2">{title}</h2>
        <p className="text-slate-400">Em desenvolvimento</p>
      </header>
      <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
        <p className="text-slate-400">Esta funcionalidade será implementada em breve.</p>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  suffix,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  suffix?: string;
}) {
  return (
    <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
      <h3 className="text-sm font-medium text-slate-400 mb-2">{title}</h3>
      <p className="text-3xl font-bold text-white">
        {value}
        {suffix && <span className="text-lg text-slate-500">{suffix}</span>}
      </p>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

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
                {formatCurrency(player.salary)}/ano
              </td>
              <td className="p-4 text-center">
                <div className="flex justify-center gap-2">
                  {player.isInjured && (
                    <span className="text-red-500 bg-red-500/10 px-2 py-0.5 rounded text-xs font-bold border border-red-500/20" title="Lesionado">
                      LES
                    </span>
                  )}
                  {player.suspensionGamesRemaining > 0 && (
                    <span className="text-red-500 bg-red-500/10 px-2 py-0.5 rounded text-xs font-bold border border-red-500/20" title="Suspenso">
                      SUS
                    </span>
                  )}
                  {player.isYouth && (
                    <span className="text-cyan-400 text-xs" title="Base">🎓</span>
                  )}
                  {!player.isInjured && player.suspensionGamesRemaining === 0 && (
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

function StaffTable({ staff }: { staff: Staff[] }) {
  if (staff.length === 0) {
    return <div className="text-slate-500 p-4">Nenhum staff contratado.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-900 text-xs uppercase font-semibold text-slate-400">
          <tr>
            <th className="p-4">Nome</th>
            <th className="p-4">Cargo</th>
            <th className="p-4 text-center">Idade</th>
            <th className="p-4 text-center">Habilidade</th>
            <th className="p-4">Especialização</th>
            <th className="p-4 text-right">Salário</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {staff.map((member) => (
            <tr key={member.id} className="hover:bg-slate-800/50 transition-colors">
              <td className="p-4 font-medium text-slate-200">
                {member.firstName} {member.lastName}
              </td>
              <td className="p-4 text-slate-300">
                {formatRole(member.role)}
              </td>
              <td className="p-4 text-center text-slate-400">{member.age}</td>
              <td className="p-4 text-center">
                <div className="inline-block px-2 py-1 rounded bg-slate-800 font-bold text-white border border-slate-700">
                  {member.overall}
                </div>
              </td>
              <td className="p-4 text-slate-400 italic">
                {member.specialization ? formatRole(member.specialization) : '-'}
              </td>
              <td className="p-4 text-right text-slate-300 font-mono text-xs">
                {formatCurrency(member.salary)}/ano
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
};

const getPositionColor = (pos: string) => {
  switch (pos) {
    case "GK": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "DF": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "MF": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "FW": return "bg-red-500/20 text-red-400 border-red-500/30";
    default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
};

const formatRole = (role: string) => {
  return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default App;