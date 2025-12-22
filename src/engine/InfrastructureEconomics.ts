import type { FacilityType } from "../domain/types/InfrastructureTypes";

export const InfrastructureEconomics = {
  LEVELS: {
    MIN: 0,
    MAX: 100,
    STEP: 1,
  },

  STADIUM: {
    EXPANSION: {
      BLOCK_SIZE: 1000,
      BASE_COST_PER_SEAT: 800,
      COST_GROWTH_FACTOR: 1.1,
      MAX_CAPACITY: 105000,
      BASE_DAYS_TO_BUILD: 30,
    },
    QUALITY: {
      BASE_COST: 500_000,
      GROWTH_FACTOR: 1.05,
      MAINTENANCE_PER_LEVEL: 2_000,
      BASE_DAYS_TO_BUILD: 10,
    },
    MAINTENANCE: {
      COST_PER_SEAT: 2,
    },
  },

  FACILITIES: {
    TRAINING: {
      NAME: "Centro de Treinamento",
      BASE_UPGRADE_COST: 200_000,
      GROWTH_FACTOR: 1.08,
      MAINTENANCE_PER_LEVEL: 5_000,
      BASE_DAYS_TO_BUILD: 14,
    },
    YOUTH: {
      NAME: "Academia de Base",
      BASE_UPGRADE_COST: 150_000,
      GROWTH_FACTOR: 1.07,
      MAINTENANCE_PER_LEVEL: 4_000,
      BASE_DAYS_TO_BUILD: 20,
    },
    MEDICAL: {
      NAME: "Centro Médico",
      BASE_UPGRADE_COST: 250_000,
      GROWTH_FACTOR: 1.09,
      MAINTENANCE_PER_LEVEL: 6_000,
      BASE_DAYS_TO_BUILD: 15,
    },
    ADMIN: {
      NAME: "Centro Administrativo",
      BASE_UPGRADE_COST: 100_000,
      GROWTH_FACTOR: 1.06,
      MAINTENANCE_PER_LEVEL: 3_000,
      BASE_DAYS_TO_BUILD: 10,
    },
  },

  BENEFITS: {
    TRAINING: {
      XP_MULTIPLIER: (level: number) => 1 + level * 0.01,
      INJURY_REDUCTION: (level: number) => level * 0.003,
    },
    MEDICAL: {
      INJURY_PREVENTION: (level: number) => level * 0.005,
      RECOVERY_SPEED: (level: number) => 1 + level * 0.02,
    },
    ADMIN: {
      MARKETING_BONUS: (level: number) => 1 + level * 0.015,
      SCOUTING_SPEED: (level: number) => 1 + level * 0.01,
    },
    YOUTH: {
      MIN_POTENTIAL: (level: number) => 40 + Math.floor(level * 0.3),
      MAX_POTENTIAL: (level: number) => 60 + Math.floor(level * 0.4),
    },
  },
};

export class InfrastructureCalculator {
  static calculateUpgradeCost(
    type: FacilityType,
    currentLevel: number
  ): number {
    if (type === "stadium") {
      const config = InfrastructureEconomics.STADIUM.EXPANSION;
      const scaleFactor = 1 + currentLevel / 50000;
      return Math.round(
        config.BLOCK_SIZE * config.BASE_COST_PER_SEAT * scaleFactor
      );
    }

    let config;
    switch (type) {
      case "training":
        config = InfrastructureEconomics.FACILITIES.TRAINING;
        break;
      case "youth":
        config = InfrastructureEconomics.FACILITIES.YOUTH;
        break;
      case "medical":
        config = InfrastructureEconomics.FACILITIES.MEDICAL;
        break;
      case "admin":
        config = InfrastructureEconomics.FACILITIES.ADMIN;
        break;
      default:
        return 0;
    }

    return Math.round(
      config.BASE_UPGRADE_COST * Math.pow(config.GROWTH_FACTOR, currentLevel)
    );
  }

  static calculateStadiumQualityCost(currentQuality: number): number {
    const config = InfrastructureEconomics.STADIUM.QUALITY;
    return Math.round(
      config.BASE_COST * Math.pow(config.GROWTH_FACTOR, currentQuality)
    );
  }

  static calculateConstructionTime(
    type: FacilityType,
    currentLevel: number
  ): number {
    if (type === "stadium")
      return InfrastructureEconomics.STADIUM.EXPANSION.BASE_DAYS_TO_BUILD;

    let baseDays = 10;
    switch (type) {
      case "training":
        baseDays =
          InfrastructureEconomics.FACILITIES.TRAINING.BASE_DAYS_TO_BUILD;
        break;
      case "youth":
        baseDays = InfrastructureEconomics.FACILITIES.YOUTH.BASE_DAYS_TO_BUILD;
        break;
      case "medical":
        baseDays =
          InfrastructureEconomics.FACILITIES.MEDICAL.BASE_DAYS_TO_BUILD;
        break;
      case "admin":
        baseDays = InfrastructureEconomics.FACILITIES.ADMIN.BASE_DAYS_TO_BUILD;
        break;
    }

    return Math.round(baseDays + currentLevel * 0.1);
  }

  static calculateStadiumQualityTime(currentQuality: number): number {
    return Math.round(
      InfrastructureEconomics.STADIUM.QUALITY.BASE_DAYS_TO_BUILD +
        currentQuality * 0.1
    );
  }

  static calculateMonthlyMaintenance(
    type: FacilityType,
    levelOrCapacity: number,
    stadiumQuality: number = 0
  ): number {
    if (type === "stadium") {
      const capacityCost =
        levelOrCapacity *
        InfrastructureEconomics.STADIUM.MAINTENANCE.COST_PER_SEAT;
      const qualityCost =
        stadiumQuality *
        InfrastructureEconomics.STADIUM.QUALITY.MAINTENANCE_PER_LEVEL;
      return Math.round(capacityCost + qualityCost);
    }

    let costPerLevel = 0;
    switch (type) {
      case "training":
        costPerLevel =
          InfrastructureEconomics.FACILITIES.TRAINING.MAINTENANCE_PER_LEVEL;
        break;
      case "youth":
        costPerLevel =
          InfrastructureEconomics.FACILITIES.YOUTH.MAINTENANCE_PER_LEVEL;
        break;
      case "medical":
        costPerLevel =
          InfrastructureEconomics.FACILITIES.MEDICAL.MAINTENANCE_PER_LEVEL;
        break;
      case "admin":
        costPerLevel =
          InfrastructureEconomics.FACILITIES.ADMIN.MAINTENANCE_PER_LEVEL;
        break;
    }

    return Math.round(levelOrCapacity * costPerLevel);
  }
}
