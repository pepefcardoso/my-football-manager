import { useState, useMemo } from "react";
import type { MenuOption } from "../../domain/constants";
import type { Team } from "../../domain/models";
import { SystemMenuModal } from "../features/system/SystemMenuModal";
import { useTeamTheme } from "../../hooks/useTeamTheme";
import { TeamLogo } from "../common/TeamLogo";
import { MENU_ITEMS, MENU_GROUPS, type MenuGroupKey } from "../../config/navigation";

interface SidebarProps {
    activePage: MenuOption;
    onNavigate: (page: MenuOption) => void;
    team: Team | null;
}

interface NavItemProps {
    page: MenuOption;
    icon: string;
    label: string;
    isActive: boolean;
    onClick: () => void;
}

function NavItem({ icon, label, isActive, onClick }: NavItemProps) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-all duration-200 group relative overflow-hidden ${isActive
                ? "text-white font-bold shadow-lg"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                }`}
            style={isActive ? {
                backgroundColor: 'var(--team-primary)',
                boxShadow: '0 0 15px var(--team-primary-20)'
            } : {}}
        >
            {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
            )}
            <span className="text-lg group-hover:scale-110 transition-transform relative z-10">{icon}</span>
            <span className="text-sm relative z-10">{label}</span>
        </button>
    );
}

function Sidebar({ activePage, onNavigate, team }: SidebarProps) {
    const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);

    useTeamTheme(team);

    const groupedItems = useMemo(() => {
        const groups: Record<string, typeof MENU_ITEMS> = {};

        MENU_ITEMS.forEach(item => {
            if (!groups[item.group]) {
                groups[item.group] = [];
            }
            groups[item.group].push(item);
        });

        return groups;
    }, []);

    const groupOrder: MenuGroupKey[] = ["club", "market", "competition"];

    return (
        <>
            <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-full z-20 relative">
                <div className="p-6 border-b border-slate-800">
                    <div
                        className="absolute -top-10 -left-10 w-40 h-40 rounded-full blur-[50px] opacity-20 pointer-events-none"
                        style={{ backgroundColor: 'var(--team-primary)' }}
                    />

                    <h1 className="text-2xl font-black italic tracking-tighter relative z-10">
                        Maestro
                    </h1>
                    {team && (
                        <div className="mt-6 flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-500">
                            <TeamLogo team={team} className="w-12 h-12" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate text-white leading-tight">{team.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">
                                    Reputação: {team.reputation}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {team && groupOrder.map((groupKey) => (
                        <div key={groupKey}>
                            <div className={`px-2 text-[10px] font-black text-slate-600 uppercase tracking-widest ${groupKey === 'club' ? 'pt-4 pb-2' : 'pt-6 pb-2'}`}>
                                {MENU_GROUPS[groupKey]}
                            </div>

                            {groupedItems[groupKey]?.map((item) => (
                                <NavItem
                                    key={item.id}
                                    page={item.id}
                                    icon={item.icon}
                                    label={item.label}
                                    isActive={activePage === item.id}
                                    onClick={() => onNavigate(item.id)}
                                />
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-900/30">
                    <button
                        onClick={() => setIsSystemMenuOpen(true)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
                    >
                        <span>⚙️</span>
                        <span className="text-sm font-medium">Sistema</span>
                    </button>
                </div>
            </aside>

            {isSystemMenuOpen && (
                <SystemMenuModal onClose={() => setIsSystemMenuOpen(false)} />
            )}
        </>
    );
}

export default Sidebar;