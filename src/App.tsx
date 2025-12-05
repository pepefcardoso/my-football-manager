// src/App.tsx
import { useEffect, useState } from "react";
import { useGameStore } from "./store/useGameStore";
import MainLayout from "./components/layout/MainLayout";
import Sidebar from "./components/layout/Sidebar";
import StartPage from "./components/pages/StartPage";
import MenuPage from "./components/pages/MenuPage";
import ClubOverviewPage from "./components/pages/ClubOverviewPage";
import SquadPage from "./components/pages/SquadPage";
import StaffPage from "./components/pages/StaffPage";
import MatchesPage from "./components/pages/MatchesPage";
import PlaceholderPage from "./components/pages/PlaceholderPage";
import type { Team } from "./domain/models";

function App() {
  const view = useGameStore((state) => state.view);
  const activePage = useGameStore((state) => state.activePage);
  const userTeam = useGameStore((state) => state.userTeam);
  const startGame = useGameStore((state) => state.startGame);
  const navigateInGame = useGameStore((state) => state.navigateInGame);
  const resetGame = useGameStore((state) => state.resetGame);

  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  useEffect(() => {
    if (view === 'team_selection' && teams.length === 0) {
      const loadTeams = async () => {
        setLoadingTeams(true);
        try {
          const data = await window.electronAPI.getTeams();
          setTeams(data);
        } catch (error) {
          console.error("Erro ao carregar times:", error);
        } finally {
          setLoadingTeams(false);
        }
      };
      loadTeams();
    }
  }, [view, teams.length]);

  if (view === 'start_screen') {
    return <StartPage />;
  }

  if (view === 'team_selection') {
    return (
      <div className="h-screen w-full bg-slate-950 overflow-auto">
        {/* Botão de voltar */}
        <div className="p-4">
          <button
            onClick={resetGame}
            className="text-slate-400 hover:text-white flex items-center gap-2"
          >
            ← Voltar
          </button>
        </div>
        <MenuPage
          teams={teams}
          loading={loadingTeams}
          onLoadTeams={() => { }}
          onSelectTeam={startGame}
        />
      </div>
    );
  }

  // Jogo Ativo (Game Loop)
  if (view === 'game_loop' && userTeam) {
    return (
      <MainLayout
        sidebar={
          <Sidebar
            activePage={activePage}
            onNavigate={navigateInGame}
            team={userTeam}
          />
        }
      >
        {activePage === "menu" && (
          <div className="p-8">
            <h2 className="text-2xl text-white mb-4">Opções do Jogo</h2>
            <button onClick={resetGame} className="px-4 py-2 bg-red-600 rounded text-white">
              Sair para o Menu Principal
            </button>
          </div>
        )}

        {activePage === "club" && <ClubOverviewPage team={userTeam} />}
        {activePage === "squad" && <SquadPage teamId={userTeam.id} />}
        {activePage === "staff" && <StaffPage teamId={userTeam.id} />}
        {activePage === "matches" && <MatchesPage teamId={userTeam.id} teams={teams} />}

        {activePage === "youth" && <PlaceholderPage title="Categorias de Base" />}
        {activePage === "scouting" && <PlaceholderPage title="Scouting" />}
        {activePage === "finances" && <PlaceholderPage title="Finanças" />}
        {activePage === "infrastructure" && <PlaceholderPage title="Infraestrutura" />}
        {activePage === "calendar" && <PlaceholderPage title="Calendário" />}
      </MainLayout>
    );
  }

  return null;
}

export default App;