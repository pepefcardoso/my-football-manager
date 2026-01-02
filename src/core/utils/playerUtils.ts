import { Player } from "../models/people";
import { Attribute } from "../models/types";

export const calculateOverall = (player: Player): number => {
  const attrs = [
    player.crossing,
    player.finishing,
    player.passing,
    player.technique,
    player.defending,
    player.speed,
    player.force,
    player.stamina,
    player.intelligence,
    player.determination,
  ];

  if (player.primaryPositionId === "GK") {
    attrs.push(player.gkReflexes, player.gkRushingOut, player.gkDistribution);
  }

  attrs.sort((a, b) => b - a);
  const top5 = attrs.slice(0, 5);
  return Math.floor(top5.reduce((a, b) => a + b, 0) / 5);
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
