export const InfrastructureEconomics = {
  STADIUM: {
    EXPANSION: {
      SEATS_PER_BLOCK: 1000,
      BASE_COST_PER_SEAT: 750,
      PREMIUM_MULTIPLIER: 1.5,
      MAX_CAPACITY: 75000,
      MIN_CAPACITY: 5000,
    },

    QUALITY: {
      COST_PER_LEVEL: 250000,
      LEVEL_INCREMENT: 5,
      MAX_QUALITY: 100,
      MIN_QUALITY: 20,
      COST_MULTIPLIER_FORMULA: (currentQuality: number) =>
        1 + Math.pow(currentQuality / 100, 2),
    },

    MAINTENANCE: {
      BASE_ANNUAL_PER_SEAT: 10,
      QUALITY_FACTOR: 0.015,
      AGE_PENALTY: 0.01,
      UTILITIES_FIXED: 500000,
      UTILITIES_PER_SEAT: 8,
      SECURITY_BASE: 750000,
      SECURITY_PER_10K: 60000,
      CLEANING_PER_MATCH: 4,
      INSURANCE_PERCENTAGE: 0.02,
    },

    REVENUE_MULTIPLIER: {
      QUALITY_BONUS: (quality: number) => 1 + (quality - 50) / 100,
      CAPACITY_UTILIZATION: (satisfaction: number) =>
        0.3 + (satisfaction / 100) * 0.7,
    },
  },

  TRAINING_CENTER: {
    UPGRADE: {
      BASE_COST: 500000,
      COST_PER_LEVEL: 100000,
      LEVEL_INCREMENT: 5,
      MAX_QUALITY: 100,
      MIN_QUALITY: 20,
      COST_MULTIPLIER_FORMULA: (currentQuality: number) =>
        1 + Math.pow(currentQuality / 80, 1.8),
    },

    MAINTENANCE: {
      BASE_ANNUAL: 400000,
      QUALITY_MULTIPLIER: 10000,
      EQUIPMENT_REPLACEMENT: 200000,
      GROUNDSKEEPING: 250000,
      STAFF_SALARIES: 600000,
    },

    BENEFITS: {
      INJURY_REDUCTION: (quality: number) => quality * 0.004,
      FITNESS_BONUS: (quality: number) => Math.floor(quality / 10),
      RECOVERY_SPEED: (quality: number) => 1 + quality / 200,
      PLAYER_DEVELOPMENT: (quality: number) => quality * 0.002,
    },
  },

  YOUTH_ACADEMY: {
    UPGRADE: {
      BASE_COST: 400000,
      COST_PER_LEVEL: 80000,
      LEVEL_INCREMENT: 5,
      MAX_QUALITY: 100,
      MIN_QUALITY: 20,
      COST_MULTIPLIER_FORMULA: (currentQuality: number) =>
        1 + Math.pow(currentQuality / 75, 1.6),
    },

    MAINTENANCE: {
      BASE_ANNUAL: 350000,
      COST_PER_YOUTH_PLAYER: 30000,
      COACHING_STAFF_BASE: 500000,
      FACILITIES_MAINTENANCE: 150000,
      SCOUTING_NETWORK: 200000,
    },

    BENEFITS: {
      INTAKE_QUALITY_BONUS: (quality: number) => Math.floor(quality / 5),
      INTAKE_QUANTITY_BONUS: (quality: number) =>
        quality >= 80 ? 2 : quality >= 60 ? 1 : 0,
      POTENTIAL_BOOST: (quality: number) => Math.floor(quality / 4),
      DEVELOPMENT_RATE: (quality: number) => 1 + quality / 150,
    },
  },

  FFP: {
    MAX_INFRASTRUCTURE_SPEND_PERCENTAGE: 0.3,
    DEPRECIATION_YEARS: 20,
    AMORTIZATION_ALLOWED: true,
  },

  FAN_BASE: {
    INITIAL_MULTIPLIER: 2.5,
    GROWTH_RATE: {
      BASE_ANNUAL: 0.02,
      SUCCESS_MULTIPLIER: {
        TITLE_WIN: 0.15,
        TOP_3_FINISH: 0.08,
        MID_TABLE: 0.03,
        RELEGATION_BATTLE: -0.05,
      },
      SATISFACTION_FACTOR: (satisfaction: number) => (satisfaction - 50) / 500,
      STADIUM_QUALITY_FACTOR: (quality: number) => quality / 2000,
    },

    CAPACITY_PRESSURE: {
      THRESHOLD: 0.9,
      SATISFACTION_PENALTY: -2,
      REVENUE_LOSS_FACTOR: 0.05,
    },

    MAX_FAN_BASE_MULTIPLIER: 50,
    MIN_FAN_BASE_MULTIPLIER: 1,
  },

  ROI: {
    STADIUM_EXPANSION: {
      PAYBACK_PERIOD_MONTHS: 36,
      ANNUAL_REVENUE_PER_SEAT: 800,
    },

    QUALITY_UPGRADES: {
      PAYBACK_PERIOD_MONTHS: 48,
      INTANGIBLE_BENEFITS: true,
    },

    TRAINING_CENTER: {
      PAYBACK_PERIOD_MONTHS: 60,
      VALUE_CREATION: "player_value_increase",
    },

    YOUTH_ACADEMY: {
      PAYBACK_PERIOD_MONTHS: 72,
      VALUE_CREATION: "youth_player_sales",
    },
  },

  VALIDATION: {
    MIN_BUDGET_RESERVE_AFTER_UPGRADE: 1000000,
    MAX_DEBT_TO_REVENUE_RATIO: 2.0,
    MIN_OPERATING_CASHFLOW_MONTHS: 6,
    MAX_ANNUAL_INFRASTRUCTURE_SPEND: 0.25,
  },
} as const;

export type InfrastructureEconomicsConfig = typeof InfrastructureEconomics;

export class InfrastructureCalculator {
  static calculateExpansionCost(
    currentCapacity: number,
    seatsToAdd: number,
    currentQuality: number
  ): number {
    const config = InfrastructureEconomics.STADIUM.EXPANSION;
    const baseCost = seatsToAdd * config.BASE_COST_PER_SEAT;

    const qualityMultiplier =
      currentQuality >= 70 ? config.PREMIUM_MULTIPLIER : 1;

    const scaleMultiplier = 1 + Math.pow(currentCapacity / 50000, 1.2);

    return Math.round(baseCost * qualityMultiplier * scaleMultiplier);
  }

  static calculateQualityUpgradeCost(
    facilityType: "stadium" | "training" | "youth",
    currentQuality: number
  ): number {
    let baseCost = 0;
    let levelIncrement = 0;
    let multiplier = 1;

    if (facilityType === "stadium") {
      const config = InfrastructureEconomics.STADIUM.QUALITY;
      baseCost = config.COST_PER_LEVEL;
      levelIncrement = config.LEVEL_INCREMENT;
      multiplier = config.COST_MULTIPLIER_FORMULA(currentQuality);
    } else if (facilityType === "training") {
      const config = InfrastructureEconomics.TRAINING_CENTER.UPGRADE;
      baseCost = config.COST_PER_LEVEL;
      levelIncrement = config.LEVEL_INCREMENT;
      multiplier = config.COST_MULTIPLIER_FORMULA(currentQuality);
    } else {
      const config = InfrastructureEconomics.YOUTH_ACADEMY.UPGRADE;
      baseCost = config.COST_PER_LEVEL;
      levelIncrement = config.LEVEL_INCREMENT;
      multiplier = config.COST_MULTIPLIER_FORMULA(currentQuality);
    }

    return Math.round(baseCost * levelIncrement * multiplier);
  }

  static calculateAnnualMaintenance(
    facilityType: "stadium" | "training" | "youth",
    capacity: number,
    quality: number,
    additionalParams?: {
      youthPlayerCount?: number;
      matchesPlayed?: number;
    }
  ): number {
    switch (facilityType) {
      case "stadium": {
        const config = InfrastructureEconomics.STADIUM.MAINTENANCE;
        const baseMaintenance = capacity * config.BASE_ANNUAL_PER_SEAT;
        const qualityAdjustment =
          baseMaintenance * quality * config.QUALITY_FACTOR;
        const utilities =
          config.UTILITIES_FIXED + capacity * config.UTILITIES_PER_SEAT;
        const security =
          config.SECURITY_BASE +
          Math.floor(capacity / 10000) * config.SECURITY_PER_10K;

        return Math.round(
          baseMaintenance + qualityAdjustment + utilities + security
        );
      }

      case "training": {
        const config = InfrastructureEconomics.TRAINING_CENTER.MAINTENANCE;
        return (
          config.BASE_ANNUAL +
          quality * config.QUALITY_MULTIPLIER +
          config.EQUIPMENT_REPLACEMENT +
          config.GROUNDSKEEPING +
          config.STAFF_SALARIES
        );
      }

      case "youth": {
        const config = InfrastructureEconomics.YOUTH_ACADEMY.MAINTENANCE;
        const youthCount = additionalParams?.youthPlayerCount || 0;
        return (
          config.BASE_ANNUAL +
          youthCount * config.COST_PER_YOUTH_PLAYER +
          config.COACHING_STAFF_BASE +
          config.FACILITIES_MAINTENANCE +
          config.SCOUTING_NETWORK
        );
      }

      default:
        return 0;
    }
  }

  static projectFanBaseGrowth(
    currentFanBase: number,
    stadiumCapacity: number,
    stadiumQuality: number,
    fanSatisfaction: number,
    leaguePosition: number
  ): number {
    const config = InfrastructureEconomics.FAN_BASE.GROWTH_RATE;

    let growthRate = config.BASE_ANNUAL;

    if (leaguePosition === 1) {
      growthRate += config.SUCCESS_MULTIPLIER.TITLE_WIN;
    } else if (leaguePosition <= 3) {
      growthRate += config.SUCCESS_MULTIPLIER.TOP_3_FINISH;
    } else if (leaguePosition <= 10) {
      growthRate += config.SUCCESS_MULTIPLIER.MID_TABLE;
    } else if (leaguePosition >= 17) {
      growthRate += config.SUCCESS_MULTIPLIER.RELEGATION_BATTLE;
    }

    growthRate += config.SATISFACTION_FACTOR(fanSatisfaction);

    growthRate += config.STADIUM_QUALITY_FACTOR(stadiumQuality);

    const projectedFanBase = Math.round(currentFanBase * (1 + growthRate));

    const maxFanBase =
      stadiumCapacity *
      InfrastructureEconomics.FAN_BASE.MAX_FAN_BASE_MULTIPLIER;
    const minFanBase =
      stadiumCapacity *
      InfrastructureEconomics.FAN_BASE.MIN_FAN_BASE_MULTIPLIER;

    return Math.max(minFanBase, Math.min(maxFanBase, projectedFanBase));
  }

  static calculateCapacityPressure(
    averageAttendance: number,
    stadiumCapacity: number
  ): {
    utilizationRate: number;
    isPressured: boolean;
    satisfactionImpact: number;
    revenueLoss: number;
  } {
    const utilizationRate = averageAttendance / stadiumCapacity;
    const config = InfrastructureEconomics.FAN_BASE.CAPACITY_PRESSURE;

    const isPressured = utilizationRate >= config.THRESHOLD;
    const satisfactionImpact = isPressured ? config.SATISFACTION_PENALTY : 0;
    const revenueLoss = isPressured
      ? (utilizationRate - config.THRESHOLD) * config.REVENUE_LOSS_FACTOR
      : 0;

    return {
      utilizationRate,
      isPressured,
      satisfactionImpact,
      revenueLoss,
    };
  }
}
