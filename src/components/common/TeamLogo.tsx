import { useMemo, useState } from "react";
import type { Team } from "../../domain/models";
import { LoadingSpinner } from "./Loading";

interface TeamLogoProps {
    team: Team | null | undefined;
    className?: string;
    showShadow?: boolean;
}

const fallbackCache = new Map<number, string>();

function generateTeamBadgeSVG(primaryColor: string, shortName: string): string {
    const color = primaryColor || "#334155";
    const text = shortName ? shortName.substring(0, 2).toUpperCase() : "FC";

    const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="${color}" rx="20" ry="20"/>
            <defs>
                <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="white" stop-opacity="0.2"/>
                    <stop offset="100%" stop-color="white" stop-opacity="0"/>
                </linearGradient>
            </defs>
            <rect width="100" height="100" fill="url(#g)" rx="20" ry="20"/>
            <text x="50" y="50" font-family="Arial, sans-serif" font-weight="900" font-size="45" fill="white" text-anchor="middle" dy=".35em">${text}</text>
        </svg>
    `.trim().replace(/\s+/g, " ");

    return `data:image/svg+xml;base64,${btoa(svgString)}`;
}

export function TeamLogo({ team, className = "w-12 h-12", showShadow = true }: TeamLogoProps) {
    const [imgError, setImgError] = useState(false);

    const logoSrc = useMemo(() => {
        if (!team) return null;

        if (team.badgeUrl && !imgError) {
            return team.badgeUrl;
        }

        if (!fallbackCache.has(team.id)) {
            const svg = generateTeamBadgeSVG(team.primaryColor, team.shortName);
            fallbackCache.set(team.id, svg);
        }

        return fallbackCache.get(team.id);
    }, [team, imgError]);

    if (!team) {
        return (
            <div className={`${className} bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700/50`}>
                <LoadingSpinner size="sm" centered={false} />
            </div>
        );
    }

    return (
        <img
            key={team.id}
            src={logoSrc || undefined}
            alt={team.name}
            loading="lazy"
            className={`
                ${className} 
                object-contain rounded-xl 
                ${showShadow ? 'drop-shadow-lg' : ''}
                transition-opacity duration-300
            `}
            onError={() => setImgError(true)}
        />
    );
}