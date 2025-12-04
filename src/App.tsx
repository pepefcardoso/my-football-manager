import { useState } from "react";
import type { Team } from "./domain/types";
import type { MenuOption } from "./domain/constants";
import ClubOverviewPage from "./components/pages/ClubOverviewPage";
import NavButton from "./components/ui/NavButton";
import MenuPage from "./components/pages/MenuPage";
import SquadPage from "./components/pages/SquadPage";
import StaffPage from "./components/pages/StaffPage";
import MatchesPage from "./components/pages/MatchesPage";
import PlaceholderPage from "./components/pages/PlaceholderPage";

function App() {
  const [currentPage, setCurrentPage] = useState<MenuOption>("menu");
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
        {currentPage === "matches" && selectedTeam && (
          <MatchesPage teamId={selectedTeam.id} teams={teams} />
        )}
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

export default App;