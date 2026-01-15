import React from "react";
import { Player } from "../../core/models/people";
import { PlayerMatchStats } from "../../core/models/match";

interface DynamicPitchViewProps {
    homeStats: PlayerMatchStats[];
    awayStats: PlayerMatchStats[];
    players: Record<string, Player>;
    homeColor: string;
    awayColor: string;
}

const PlayerMarker: React.FC<{
    name: string;
    role: string;
    color: string;
    top: string;
    left: string
}> = ({ name, role, color, top, left }) => (
    <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-500"
        style={{ top, left }}
    >
        <div
            className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
            style={{ backgroundColor: color }}
        >
            {role}
        </div>
        <span className="text-[9px] text-white font-medium bg-black/40 px-1 rounded mt-0.5 whitespace-nowrap overflow-hidden max-w-[60px] text-ellipsis">
            {name.split(' ').pop()}
        </span>
    </div>
);

const getPositionCoords = (posId: string, index: number, total: number, isHome: boolean) => {
    let basePathY = 0;

    if (isHome) {
        switch (posId) {
            case 'GK': basePathY = 92; break;
            case 'DEF': basePathY = 75; break;
            case 'MID': basePathY = 45; break;
            case 'ATT': basePathY = 20; break;
            default: basePathY = 50;
        }
    } else {
        switch (posId) {
            case 'GK': basePathY = 8; break;
            case 'DEF': basePathY = 25; break;
            case 'MID': basePathY = 55; break;
            case 'ATT': basePathY = 80; break;
            default: basePathY = 50;
        }
    }

    const segment = 80 / (total + 1);
    const baseX = 10 + (segment * (index + 1));

    return { top: `${basePathY}%`, left: `${baseX}%` };
};

export const DynamicPitchView: React.FC<DynamicPitchViewProps> = ({
    homeStats, awayStats, players, homeColor, awayColor
}) => {

    const renderTeam = (stats: PlayerMatchStats[], isHome: boolean, color: string) => {
        const lines = { GK: [], DEF: [], MID: [], ATT: [] } as Record<string, PlayerMatchStats[]>;

        stats.forEach(stat => {
            const role = stat.positionPlayedId as keyof typeof lines;
            if (lines[role]) lines[role].push(stat);
            else lines['MID'].push(stat);
        });

        return Object.entries(lines).map(([role, playersInRole]) =>
            playersInRole.map((stat, index) => {
                const player = players[stat.playerId];
                if (!player) return null;
                const coords = getPositionCoords(role, index, playersInRole.length, isHome);

                return (
                    <PlayerMarker
                        key={stat.id}
                        name={player.name}
                        role={role.substring(0, 1)}
                        color={color}
                        top={coords.top}
                        left={coords.left}
                    />
                );
            })
        );
    };

    return (
        <div className="relative bg-emerald-800 border-2 border-white/20 rounded-lg h-96 w-full overflow-hidden shadow-inner select-none">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .3) 25%, rgba(255, 255, 255, .3) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .3) 75%, rgba(255, 255, 255, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .3) 25%, rgba(255, 255, 255, .3) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .3) 75%, rgba(255, 255, 255, .3) 76%, transparent 77%, transparent)', backgroundSize: '50px 50px' }}></div>

            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/30 transform -translate-y-1/2"></div>
            <div className="absolute top-1/2 left-1/2 w-20 h-20 border-2 border-white/30 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute top-0 left-1/4 right-1/4 h-16 border-b-2 border-x-2 border-white/30"></div>
            <div className="absolute bottom-0 left-1/4 right-1/4 h-16 border-t-2 border-x-2 border-white/30"></div>

            {renderTeam(homeStats, true, homeColor)}
            {renderTeam(awayStats, false, awayColor)}
        </div>
    );
};