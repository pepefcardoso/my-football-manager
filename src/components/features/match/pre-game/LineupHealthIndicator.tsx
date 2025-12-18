import type { Player } from "../../../../domain/models";


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

    const emptyPositions = starters.filter((p) => p === null).length;
    if (emptyPositions > 0) {
        issues.push({
            severity: "critical",
            message: `${emptyPositions} posição(ões) vazia(s)`,
            icon: "❌",
        });
    }

    const lowEnergyPlayers = starters.filter(
        (p) => p !== null && p.energy < 40
    ).length;
    if (lowEnergyPlayers > 0) {
        issues.push({
            severity: "warning",
            message: `${lowEnergyPlayers} jogador(es) com energia crítica`,
            icon: "⚡",
        });
    }

    const lowMoralPlayers = starters.filter(
        (p) => p !== null && p.moral < 50
    ).length;
    if (lowMoralPlayers > 0) {
        issues.push({
            severity: "warning",
            message: `${lowMoralPlayers} jogador(es) desmotivado(s)`,
            icon: "😔",
        });
    }

    // Verificar jogadores lesionados (não deveriam estar aqui)
    const injuredPlayers = starters.filter(
        (p) => p !== null && p.isInjured
    ).length;
    if (injuredPlayers > 0) {
        issues.push({
            severity: "critical",
            message: `${injuredPlayers} jogador(es) LESIONADO(S)!`,
            icon: "🩹",
        });
    }

    // TODO: Detectar jogadores fora de posição
    // (requer mapeamento formação -> posições esperadas)

    const criticalIssues = issues.filter((i) => i.severity === "critical").length;
    const warnings = issues.filter((i) => i.severity === "warning").length;

    const getHealthColor = () => {
        if (criticalIssues > 0) return "border-red-500 bg-red-500/10";
        if (warnings > 0) return "border-amber-500 bg-amber-500/10";
        return "border-emerald-500 bg-emerald-500/10";
    };

    const getHealthLabel = () => {
        if (criticalIssues > 0) return "Lineup Crítico";
        if (warnings > 0) return "Avisos Detectados";
        return "Lineup Saudável";
    };

    const getHealthIcon = () => {
        if (criticalIssues > 0) return "🚨";
        if (warnings > 0) return "⚠️";
        return "✅";
    };

    return (
        <div className={`rounded-lg border-2 p-4 ${getHealthColor()}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{getHealthIcon()}</span>
                    <h3 className="font-bold text-white">{getHealthLabel()}</h3>
                </div>
                <div className="text-xs text-slate-400">
                    Formação: <span className="text-white font-mono">{formation}</span>
                </div>
            </div>

            {issues.length > 0 && (
                <div className="space-y-2">
                    {issues.map((issue, index) => (
                        <div
                            key={index}
                            className={`
                flex items-start gap-2 p-2 rounded text-sm
                ${issue.severity === "critical"
                                    ? "bg-red-500/20 text-red-300"
                                    : issue.severity === "warning"
                                        ? "bg-amber-500/20 text-amber-300"
                                        : "bg-blue-500/20 text-blue-300"
                                }
              `}
                        >
                            <span className="text-base">{issue.icon}</span>
                            <span className="flex-1">{issue.message}</span>
                        </div>
                    ))}
                </div>
            )}

            {issues.length === 0 && (
                <p className="text-sm text-emerald-300">
                    Todos os jogadores estão em boas condições e nas posições corretas.
                </p>
            )}
        </div>
    );
}