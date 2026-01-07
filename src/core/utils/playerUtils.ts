import { Player } from "../models/people";
import { Attribute } from "../models/types";
import { PlayerCalculations } from "../models/player";

export const calculateOverall = (player: Player): number => {
  return PlayerCalculations.calculateOverall(player);
};

export const getAttributeColorClass = (value: Attribute): string => {
  if (value >= 80) return "text-status-success font-bold";
  if (value >= 60) return "text-blue-400 font-medium";
  if (value >= 50) return "text-text-primary";
  if (value >= 40) return "text-yellow-500";
  return "text-status-danger";
};

export const formatPosition = (posId: string): string => {
  const map: Record<string, string> = {
    GK: "Goleiro",
    DEF: "Defensor",
    MID: "Médio",
    ATT: "Atacante",
  };
  return map[posId] || posId;
};
