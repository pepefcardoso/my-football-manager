export const COLORS = {
  energy: {
    high: "bg-emerald-500",
    medium: "bg-yellow-500",
    low: "bg-red-500",
  },
  moral: {
    high: "text-emerald-400",
    medium: "text-yellow-400",
    low: "text-red-400",
  },
} as const;

export const getEnergyColorClass = (energy: number): string => {
  if (energy > 80) return COLORS.energy.high;
  if (energy > 50) return COLORS.energy.medium;
  return COLORS.energy.low;
};

export const getMoralColorClass = (moral: number): string => {
  if (moral >= 80) return COLORS.moral.high;
  if (moral < 50) return COLORS.moral.low;
  return COLORS.moral.medium;
};
