import type { MenuOption } from "../../domain/constants";
import type { Team } from "../../domain/models";
import NavButton from "../common/NavButton";

interface SidebarProps {
    activePage: MenuOption;
    onNavigate: (page: MenuOption) => void;
    team: Team | null;
}

function Sidebar({ activePage, onNavigate, team }: SidebarProps) {
    return (
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
            <div className="p-6 border-b border-slate-800">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
                    FM 2025
                </h1>
                {team && (
                    <div className="mt-4 flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg"
                            style={{ backgroundColor: team.primaryColor || "#333" }}
                        >
                            {team.shortName.substring(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{team.name}</p>
                            <p className="text-xs text-slate-500">Reputação: {team.reputation}</p>
                        </div>
                    </div>
                )}
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <NavButton
                    active={activePage === "menu"}
                    onClick={() => onNavigate("menu")}
                    icon="🏠"
                >
                    Menu Principal
                </NavButton>

                {team && (
                    <>
                        <div className="pt-4 pb-2 px-2 text-xs font-semibold text-slate-500 uppercase">
                            Gestão
                        </div>
                        <NavButton
                            active={activePage === "club"}
                            onClick={() => onNavigate("club")}
                            icon="🏛️"
                        >
                            Visão Geral
                        </NavButton>
                        <NavButton
                            active={activePage === "squad"}
                            onClick={() => onNavigate("squad")}
                            icon="⚽"
                        >
                            Elenco Principal
                        </NavButton>
                        <NavButton
                            active={activePage === "staff"}
                            onClick={() => onNavigate("staff")}
                            icon="👔"
                        >
                            Equipa Técnica
                        </NavButton>
                        <NavButton
                            active={activePage === "youth"}
                            onClick={() => onNavigate("youth")}
                            icon="🎓"
                        >
                            Categorias de Base
                        </NavButton>
                        <NavButton
                            active={activePage === "scouting"}
                            onClick={() => onNavigate("scouting")}
                            icon="🔍"
                        >
                            Scouting
                        </NavButton>
                        <NavButton
                            active={activePage === "finances"}
                            onClick={() => onNavigate("finances")}
                            icon="💰"
                        >
                            Finanças
                        </NavButton>
                        <NavButton
                            active={activePage === "infrastructure"}
                            onClick={() => onNavigate("infrastructure")}
                            icon="🏗️"
                        >
                            Infraestrutura
                        </NavButton>

                        <div className="pt-4 pb-2 px-2 text-xs font-semibold text-slate-500 uppercase">
                            Competição
                        </div>
                        <NavButton
                            active={activePage === "matches"}
                            onClick={() => onNavigate("matches")}
                            icon="🎮"
                        >
                            Próximas Partidas
                        </NavButton>
                        <NavButton
                            active={activePage === "calendar"}
                            onClick={() => onNavigate("calendar")}
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
    );
}

export default Sidebar;