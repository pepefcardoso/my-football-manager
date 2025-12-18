import type { Player } from "../../../../domain/models";
import { FORMATION_LAYOUTS, DEFAULT_LAYOUT } from "../../../../domain/tactics/formationLayouts";
import { calculatePositionPenalty } from "../../../../domain/logic/penaltyCalculator";

interface LineupHealthIndicatorProps {
    starters: (Player | null)[];
    formation: string;
}

interface LineupIssue {
    severity: "critical" | "warning" | "info";
    message: string;
    icon: string;
}

export function LineupHealthIndicator({
    starters,
    formation,
}: LineupHealthIndicatorProps) {
    const issues: LineupIssue[] = [];
    const layout = FORMATION_LAYOUTS[formation] || DEFAULT_LAYOUT;

    const emptyPositions = starters.filter((p) => p === null).length;
    if (emptyPositions > 0) {
        issues.push({
            severity: "critical",
            message: `${emptyPositions} posição(ões) vazia(s)`,
            icon: "❌",
        });
    }

    const lowEnergyPlayers = starters.filter((p) => p !== null && p.energy < 50).length;
    if (lowEnergyPlayers > 0) {
        issues.push({
            severity: "warning",
            message: `${lowEnergyPlayers} jogador(es) cansado(s) (<50%)`,
            icon: "⚡",
        });
    }

    let severePosPenaltyCount = 0;
    let mediumPosPenaltyCount = 0;

    starters.forEach((player, index) => {
        if (!player) return;

        const expectedRole = layout[index]?.role || "MF";

        const { severity } = calculatePositionPenalty(player, expectedRole);

        if (severity === "critical" || severity === "high") {
            severePosPenaltyCount++;
        } else if (severity === "medium") {
            mediumPosPenaltyCount++;
        }
    });

    if (severePosPenaltyCount > 0) {
        issues.push({
            severity: "critical",
            message: `${severePosPenaltyCount} jogador(es) totalmente fora de posição!`,
            icon: "🚨",
        });
    } else if (mediumPosPenaltyCount > 0) {
        issues.push({
            severity: "warning",
            message: `${mediumPosPenaltyCount} jogador(es) improvisado(s).`,
            icon: "⚠️",
        });
    }

    const injuredPlayers = starters.filter((p) => p !== null && p.isInjured).length;
    if (injuredPlayers > 0) {
        issues.push({
            severity: "critical",
            message: `${injuredPlayers} jogador(es) LESIONADO(S)!`,
            icon: "🩹",
        });
    }

    const criticalIssues = issues.filter((i) => i.severity === "critical").length;
    const warnings = issues.filter((i) => i.severity === "warning").length;

    const getHealthColor = () => {
        if (criticalIssues > 0) return "border-red-500 bg-red-500/10";
        if (warnings > 0) return "border-amber-500 bg-amber-500/10";
        return "border-emerald-500 bg-emerald-500/10";
    };

    const getHealthLabel = () => {
        if (criticalIssues > 0) return "Lineup Crítico";
        if (warnings > 0) return "Atenção Requerida";
        return "Pronto para Jogo";
    };

    const getHealthIcon = () => {
        if (criticalIssues > 0) return "🛑";
        if (warnings > 0) return "⚠️";
        return "✅";
    };

    return (
        <div className={`rounded-lg border-2 p-4 mb-4 transition-colors ${getHealthColor()}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{getHealthIcon()}</span>
                    <div>
                        <h3 className="font-bold text-white leading-none">{getHealthLabel()}</h3>
                        <span className="text-xs text-slate-400">Formação: {formation}</span>
                    </div>
                </div>
            </div>

            {issues.length > 0 ? (
                <div className="space-y-1">
                    {issues.map((issue, index) => (
                        <div
                            key={index}
                            className={`
                                flex items-center gap-2 px-2 py-1 rounded text-xs font-medium
                                ${issue.severity === "critical"
                                    ? "bg-red-500/20 text-red-300"
                                    : issue.severity === "warning"
                                        ? "bg-amber-500/20 text-amber-300"
                                        : "bg-blue-500/20 text-blue-300"
                                }
                            `}
                        >
                            <span>{issue.icon}</span>
                            <span>{issue.message}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-emerald-300 mt-1">
                    Time escalado corretamente. Boa sorte!
                </p>
            )}
        </div>
    );
}