import { useUIStore } from "./state/useUIStore";
import { MainLayout } from "./ui/layouts/MainLayout";
import { MainMenuScreen } from "./ui/screens/MainMenuScreen";
import { NewGameSetupScreen } from "./ui/screens/NewGameSetupScreen";
import { DashboardScreen } from "./ui/screens/DashboardScreen";
import { SquadScreen } from "./ui/screens/SquadScreen";
import { CompetitionsScreen } from "./ui/screens/CompetitionsScreen";
import { MatchPreparationScreen } from "./ui/screens/MatchPreparationScreen";
import { MatchLiveScreen } from "./ui/screens/MatchLiveScreen";
import { MatchResultScreen } from "./ui/screens/MatchResultScreen";
import { CalendarScreen } from "./ui/screens/CalendarScreen";
import { ManagerProfileScreen } from "./ui/screens/ManagerProfileScreen";
import { GameErrorBoundary } from "./ui/components/GameErrorBoundary";
import { useEffect } from "react";
import { setupNotificationBridge } from "./state/listeners/NotificationBinding";

const TacticsScreen = () => <div className="p-4">Táticas (Em breve)</div>;

function App() {
  const currentView = useUIStore((state) => state.currentView);

  useEffect(() => {
    setupNotificationBridge();
  }, []);

  if (currentView === "MAIN_MENU") {
    return <MainMenuScreen />;
  }

  if (currentView === "NEW_GAME_SETUP") {
    return <NewGameSetupScreen />;
  }

  const renderGameView = () => {
    switch (currentView) {
      case "DASHBOARD": return <DashboardScreen />;
      case "SQUAD": return <SquadScreen />;
      case "TACTICS": return <TacticsScreen />;
      case "COMPETITIONS": return <CompetitionsScreen />;
      case "MATCH_PREPARATION": return <MatchPreparationScreen />;
      case "MATCH_LIVE": return <MatchLiveScreen />;
      case "MATCH_RESULT": return <MatchResultScreen />;
      case "MANAGER_PROFILE": return <ManagerProfileScreen />;
      case "CALENDAR": return <CalendarScreen />;
      default: return <div className="text-text-muted p-8">Funcionalidade {currentView} em desenvolvimento.</div>;
    }
  };
  return (
    <MainLayout>
      <GameErrorBoundary>
        {renderGameView()}
      </GameErrorBoundary>
    </MainLayout>
  );
}

export default App;