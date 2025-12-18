import type { Player } from "../models";

interface PenaltyResult {
  multiplier: number;
  penaltyValue: number;
  effectiveOverall: number;
  severity: "none" | "low" | "medium" | "high" | "critical";
  message: string;
}

const PENALTY_MATRIX: Record<string, Record<string, number>> = {
  GK: { DF: 0.5, MF: 0.1, FW: 0.05 },
  DF: { DF: 1.0, MF: 0.7, FW: 0.4, GK: 0.1 },
  MF: { DF: 0.7, MF: 1.0, FW: 0.7, GK: 0.1 },
  FW: { DF: 0.3, MF: 0.6, FW: 1.0, GK: 0.1 },
};

const MESSAGES: Record<string, Record<string, string>> = {
  GK: {
    DF: "Goleiro na linha: Penalidade severa",
    MF: "Goleiro no meio: Inviável",
    FW: "Goleiro no ataque: Inviável",
  },
  DF: {
    MF: "Zagueiro improvisado no meio",
    FW: "Zagueiro perdido no ataque",
    GK: "Jogador de linha no gol",
  },
  MF: {
    DF: "Meia improvisado na defesa",
    FW: "Meia improvisado no ataque",
    GK: "Jogador de linha no gol",
  },
  FW: {
    MF: "Atacante recuado",
    DF: "Atacante na defesa: Risco total",
    GK: "Jogador de linha no gol",
  },
};

export function calculatePositionPenalty(
  player: Player,
  assignedRole: string
): PenaltyResult {
  if (!assignedRole || player.position === assignedRole) {
    return {
      multiplier: 1,
      penaltyValue: 0,
      effectiveOverall: player.overall,
      severity: "none",
      message: "Posição Natural",
    };
  }

  const multiplier = PENALTY_MATRIX[player.position]?.[assignedRole] ?? 0.5;
  const effectiveOverall = Math.round(player.overall * multiplier);
  const penaltyValue = player.overall - effectiveOverall;
  const message =
    MESSAGES[player.position]?.[assignedRole] || "Fora de posição";

  let severity: PenaltyResult["severity"] = "none";
  if (penaltyValue > 0) severity = "low";
  if (penaltyValue > 5) severity = "medium";
  if (penaltyValue > 15) severity = "high";
  if (penaltyValue > 30) severity = "critical";

  return {
    multiplier,
    penaltyValue,
    effectiveOverall,
    severity,
    message,
  };
}
