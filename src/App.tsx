import { useUIStore } from "./state/useUIStore";
import { MainLayout } from "./ui/layouts/MainLayout";
import { MainMenuScreen } from "./ui/screens/MainMenuScreen";
import { NewGameSetupScreen } from "./ui/screens/NewGameSetupScreen";

const DashboardScreen = () => <div className="p-4">Dashboard Principal</div>;
const SquadScreen = () => <div className="p-4">Elenco</div>;
const TacticsScreen = () => <div className="p-4">Táticas</div>;

function App() {
  const currentView = useUIStore((state) => state.currentView);

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
      default: return <div className="text-text-muted p-8">Funcionalidade {currentView} em desenvolvimento.</div>;
    }
  };

  return (
    <MainLayout>
      {renderGameView()}
    </MainLayout>
  );
}

export default App;