import type { Team } from "../../domain/models";

interface TeamLogoProps {
    team: Team | null | undefined;
    className?: string;
    showShadow?: boolean;
}

export function TeamLogo({ team, className = "w-12 h-12", showShadow = true }: TeamLogoProps) {
    if (!team) {
        return <div className={`${className} bg-slate-800 rounded-full animate-pulse`} />;
    }

    if (team.badgeUrl) {
        return (
            <img
                src={team.badgeUrl}
                alt={team.name}
                className={`${className} object-contain ${showShadow ? 'drop-shadow-lg' : ''}`}
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
            />
        );
    }

    return (
        <div
            className={`${className} rounded-xl flex items-center justify-center font-black text-white relative overflow-hidden ${showShadow ? 'shadow-lg' : ''}`}
            style={{ backgroundColor: team.primaryColor || "#334155" }}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
            <span className="relative z-10 drop-shadow-md select-none text-[40%]">
                {team.shortName.substring(0, 2).toUpperCase()}
            </span>
        </div>
    );
}