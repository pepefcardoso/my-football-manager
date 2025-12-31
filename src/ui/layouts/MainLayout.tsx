import React from "react";
import { useUIStore, GameView } from "../../state/useUIStore";
import {
    LayoutDashboard,
    Users,
    ClipboardList,
    Calendar,
    TrendingUp,
    Building2,
    Settings,
} from "lucide-react";
import { clsx } from "clsx";

interface NavItemProps {
    view: GameView;
    label: string;
    icon: React.ElementType;
    isActive: boolean;
    onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ view, label, icon: Icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={clsx(
            "flex items-center w-full px-4 py-3 text-sm font-medium transition-colors duration-200 border-l-4",
            isActive
                ? "bg-background-tertiary border-primary text-text-primary"
                : "border-transparent text-text-secondary hover:bg-background-tertiary/50 hover:text-text-primary"
        )}
    >
        <Icon size={20} className="mr-3" />
        <span>{label}</span>
    </button>
);

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentView, setView } = useUIStore();

    const navItems: { view: GameView; label: string; icon: any }[] = [
        { view: "DASHBOARD", label: "Visão Geral", icon: LayoutDashboard },
        { view: "SQUAD", label: "Elenco", icon: Users },
        { view: "TACTICS", label: "Táticas", icon: ClipboardList },
        { view: "CALENDAR", label: "Calendário", icon: Calendar },
        { view: "MARKET", label: "Transferências", icon: TrendingUp },
        { view: "CLUB_INFRA", label: "Clube", icon: Building2 },
        { view: "SETTINGS", label: "Opções", icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-background text-text-primary overflow-hidden font-sans">
            <aside className="w-64 bg-background-secondary border-r border-background-tertiary flex flex-col shadow-xl z-10">
                <div className="p-6 flex items-center justify-center border-b border-background-tertiary">
                    <h1 className="text-2xl font-bold tracking-wider text-primary">MAESTRO</h1>
                </div>

                <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavItem
                            key={item.view}
                            {...item}
                            isActive={currentView === item.view}
                            onClick={() => setView(item.view)}
                        />
                    ))}
                </nav>

                <div className="p-4 border-t border-background-tertiary">
                    <div className="text-xs text-text-muted text-center">
                        v1.0.0 Alpha
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">
                <header className="h-16 bg-background-secondary/80 backdrop-blur border-b border-background-tertiary flex items-center justify-between px-6">
                    <h2 className="text-lg font-semibold text-text-primary">
                        {navItems.find(i => i.view === currentView)?.label}
                    </h2>

                    <div className="flex items-center space-x-4">
                        <span className="text-text-secondary text-sm">Próximo Jogo: vs Benfica (C)</span>
                        <div className="px-4 py-2 bg-background-tertiary rounded text-sm font-mono">
                            01/07/2024
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};