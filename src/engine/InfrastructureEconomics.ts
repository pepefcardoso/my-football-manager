import type { FacilityType } from "../domain/types/InfrastructureTypes";

const CONFIG = {
  LEVELS: {
    MIN: 0,
    MAX: 100,
    STADIUM_CAPACITY_MAX: 105000,
  },

  BASE_COSTS: {
    stadium_capacity: 1000,
    stadium_quality: 500_000,
    training: 250_000,
    medical: 200_000,
    youth: 150_000,
    admin: 100_000,
  },

  GROWTH_FACTORS: {
    stadium_capacity: 1.0,
    stadium_quality: 1.05,
    training: 1.08,
    medical: 1.07,
    youth: 1.06,
    admin: 1.05,
  },

  MAINTENANCE_RATES: {
    stadium_capacity: 2,
    stadium_quality: 1_000,
    training: 5_000,
    medical: 4_000,
    youth: 3_000,
    admin: 2_000,
  },

  CONSTRUCTION_TIME: {
    BASE_DAYS: 14,
    LEVEL_MULTIPLIER: 0.2,
    STADIUM_SEAT_BATCH: 1000,
    STADIUM_DAYS_PER_BATCH: 7,
  },
};

export class InfrastructureEconomics {
  /**
   * @param type Tipo da instalação
   * @param currentLevel Nível atual (ou capacidade atual)
   * @param amount Quantidade a aumentar (padrão 1, usado para assentos do estádio)
   */
  static getUpgradeCost(
    type: FacilityType,
    currentLevel: number,
    amount: number = 1
  ): number {
    if (type === "stadium_capacity") {
      const baseCost = CONFIG.BASE_COSTS.stadium_capacity;
      const sizePenalty = currentLevel > 50000 ? 1.2 : 1.0;
      return Math.round(amount * baseCost * sizePenalty);
    }

    const base = CONFIG.BASE_COSTS[type];
    const factor = CONFIG.GROWTH_FACTORS[type];

    return Math.round(base * Math.pow(factor, currentLevel));
  }

  static getMaintenanceCost(type: FacilityType, currentLevel: number): number {
    const rate = CONFIG.MAINTENANCE_RATES[type];
    return Math.round(currentLevel * rate);
  }

  static getConstructionDuration(
    type: FacilityType,
    currentLevel: number,
    amount: number = 1
  ): number {
    if (type === "stadium_capacity") {
      const batches = Math.ceil(
        amount / CONFIG.CONSTRUCTION_TIME.STADIUM_SEAT_BATCH
      );
      return Math.max(
        14,
        batches * CONFIG.CONSTRUCTION_TIME.STADIUM_DAYS_PER_BATCH
      );
    }

    const base = CONFIG.CONSTRUCTION_TIME.BASE_DAYS;
    const addedTime = currentLevel * CONFIG.CONSTRUCTION_TIME.LEVEL_MULTIPLIER;

    return Math.round(base + addedTime);
  }

  static getBenefitDescription(type: FacilityType, level: number): string {
    switch (type) {
      case "stadium_capacity":
        return `Capacidade: ${level.toLocaleString()} torcedores`;
      case "stadium_quality":
        return `Atratividade: +${level}% preço ingresso`;
      case "training":
        return `XP Treino: +${(level * 0.5).toFixed(1)}%`;
      case "medical":
        return `Recuperação: +${(level * 0.4).toFixed(1)}% mais rápida`;
      case "youth":
        return `Potencial Base: ${40 + Math.floor(level * 0.4)}`;
      case "admin":
        return `Eficiência Scouting: +${level}%`;
      default:
        return "N/A";
    }
  }

  static getMaxLevel(type: FacilityType): number {
    return type === "stadium_capacity"
      ? CONFIG.LEVELS.STADIUM_CAPACITY_MAX
      : CONFIG.LEVELS.MAX;
  }
}
