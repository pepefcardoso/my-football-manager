// src/App.tsx
import { useState } from "react";

type Team = {
  id: number;
  name: string;
  shortName: string;
  primaryColor: string | null;
  reputation: number | null;
  budget: number | null;
};

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
    </div>
  );
}

function SquadPage({ teamId }: { teamId: number }) {
  return (
    <div className="p-8">
      <header className="mb-8">
        <h2 className="text-3xl font-light mb-2">Elenco Principal</h2>
        <p className="text-slate-400">Gerir jogadores e táticas</p>
      </header>
      <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
        <p className="text-slate-400">
          Sistema de gestão de elenco será implementado na próxima fase.
        </p>
        <p className="text-xs text-slate-500 mt-2">Team ID: {teamId}</p>
      </div>
    </div>
  );
}

function StaffPage({ teamId }: { teamId: number }) {
  return (
    <div className="p-8">
      <header className="mb-8">
        <h2 className="text-3xl font-light mb-2">Equipa Técnica</h2>
        <p className="text-slate-400">Gerir profissionais do clube</p>
      </header>
      <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
        <p className="text-slate-400">
          Sistema de gestão de staff será implementado na próxima fase.
        </p>
        <p className="text-xs text-slate-500 mt-2">Team ID: {teamId}</p>
      </div>
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

export default App;