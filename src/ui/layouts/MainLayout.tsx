import React, { useMemo } from "react";
import { useUIStore, GameView } from "../../state/useUIStore";
import { useGameStore } from "../../state/useGameStore";
import { formatDate } from "../../core/utils/formatters";
import { NotificationCenter } from "../components/NotificationCenter";
import {
    LayoutDashboard,
    Users,
    ClipboardList,
    Calendar,
    TrendingUp,
    Building2,
    Settings,
    Trophy,
} from "lucide-react";
import { clsx } from "clsx";

interface NavItemProps {
    view: GameView;
    label: string;
    icon: React.ElementType;
    isActive: boolean;
    onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ label, icon: Icon, isActive, onClick }) => (
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
    const { meta, matches, clubs } = useGameStore();
    const userClubId = meta.userClubId;

    const nextMatchInfo = useMemo(() => {
        if (!userClubId) return "Carregando...";

        const allMatches = Object.values(matches);
        const upcomingMatches = allMatches.filter(
            (m) =>
                m.status === "SCHEDULED" &&
                (m.homeClubId === userClubId || m.awayClubId === userClubId) &&
                m.datetime >= meta.currentDate
        );

        upcomingMatches.sort((a, b) => a.datetime - b.datetime);
        const nextMatch = upcomingMatches[0];

        if (!nextMatch) return "Sem jogos agendados";

        const isHome = nextMatch.homeClubId === userClubId;
        const opponentId = isHome ? nextMatch.awayClubId : nextMatch.homeClubId;
        const opponentName = clubs[opponentId]?.name || "Desconhecido";

        return `vs ${opponentName} (${isHome ? 'C' : 'F'})`;
    }, [matches, userClubId, meta.currentDate, clubs]);

    const navItems: { view: GameView; label: string; icon: any }[] = [
        { view: "DASHBOARD", label: "Visão Geral", icon: LayoutDashboard },
        { view: "SQUAD", label: "Elenco", icon: Users },
        { view: "TACTICS", label: "Táticas", icon: ClipboardList },
        { view: "COMPETITIONS", label: "Competições", icon: Trophy },
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
                <header className="h-16 bg-background-secondary/80 backdrop-blur border-b border-background-tertiary flex items-center justify-between px-6 z-20">
                    <h2 className="text-lg font-semibold text-text-primary">
                        {navItems.find(i => i.view === currentView)?.label}
                    </h2>

                    <div className="flex items-center space-x-6">
                        <span className="text-text-secondary text-sm hidden md:inline">
                            Próximo Jogo: <span className="font-medium text-text-primary">{nextMatchInfo}</span>
                        </span>

                        <div className="h-6 w-px bg-background-tertiary hidden md:block"></div>

                        <div className="flex items-center space-x-4">
                            <NotificationCenter />
                            <div className="px-4 py-2 bg-background-tertiary rounded text-sm font-mono text-text-primary shadow-inner">
                                {formatDate(meta.currentDate)}
                            </div>
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