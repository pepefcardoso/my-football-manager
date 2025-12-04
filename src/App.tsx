import { useState } from "react";
import MainLayout from "./components/layout/MainLayout";
import Sidebar from "./components/layout/Sidebar";
import ClubOverviewPage from "./components/pages/ClubOverviewPage";
import MenuPage from "./components/pages/MenuPage";
import SquadPage from "./components/pages/SquadPage";
import StaffPage from "./components/pages/StaffPage";
import MatchesPage from "./components/pages/MatchesPage";
import PlaceholderPage from "./components/pages/PlaceholderPage";
import type { Team } from "./domain/models";
import type { MenuOption } from "./domain/constants";

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
    <MainLayout
      sidebar={
        <Sidebar
          activePage={currentPage}
          onNavigate={setCurrentPage}
          team={selectedTeam}
        />
      }
    >
      {currentPage === "menu" && (
        <MenuPage
          teams={teams}
          loading={loading}
          onLoadTeams={loadTeams}
          onSelectTeam={selectTeam}
        />
      )}

      {currentPage === "club" && selectedTeam && (
        <ClubOverviewPage team={selectedTeam} />
      )}

      {currentPage === "squad" && selectedTeam && (
        <SquadPage teamId={selectedTeam.id} />
      )}

      {currentPage === "staff" && selectedTeam && (
        <StaffPage teamId={selectedTeam.id} />
      )}

      {currentPage === "matches" && selectedTeam && (
        <MatchesPage teamId={selectedTeam.id} teams={teams} />
      )}

      {currentPage === "youth" && <PlaceholderPage title="Categorias de Base" />}
      {currentPage === "scouting" && <PlaceholderPage title="Scouting" />}
      {currentPage === "finances" && <PlaceholderPage title="Finanças" />}
      {currentPage === "infrastructure" && <PlaceholderPage title="Infraestrutura" />}
      {currentPage === "calendar" && <PlaceholderPage title="Calendário" />}
    </MainLayout>
  );
}

export default App;