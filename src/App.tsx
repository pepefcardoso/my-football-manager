import { MainLayout } from "./ui/layouts/MainLayout";
import { useUIStore } from "./state/useUIStore";

const DashboardScreen = () => <div className="p-4 bg-background-secondary rounded-lg border border-background-tertiary">Bem-vindo ao Maestro Manager.</div>;
const SquadScreen = () => <div className="text-text-secondary">Lista de Jogadores (Em breve)</div>;
const TacticsScreen = () => <div className="text-text-secondary">Prancheta Tática (Em breve)</div>;

function App() {
  const currentView = useUIStore((state) => state.currentView);

  const renderView = () => {
    switch (currentView) {
      case "DASHBOARD": return <DashboardScreen />;
      case "SQUAD": return <SquadScreen />;
      case "TACTICS": return <TacticsScreen />;
      default: return <div className="text-text-muted">Funcionalidade em desenvolvimento: {currentView}</div>;
    }
  };

  return (
    <MainLayout>
      {renderView()}
    </MainLayout>
  );
}

export default App;