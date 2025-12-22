import type {
  AdminCenterBenefits,
  FacilityType,
  MedicalCenterBenefits,
  StadiumBenefits,
  TrainingCenterBenefits,
  YouthAcademyBenefits,
} from "../domain/types/InfrastructureTypes";

const CONFIG = {
  LEVELS: {
    MIN: 0,
    MAX: 100,
    STADIUM_CAPACITY_MAX: 105000,
  },

  BASE_UPGRADE_COSTS: {
    stadium_capacity: 1000,
    stadium_quality: 500_000,
    training_center_quality: 250_000,
    youth_academy_quality: 200_000,
    medical_center_quality: 150_000,
    administrative_center_quality: 100_000,
  },

  GROWTH_FACTORS: {
    stadium_capacity: 1.0,
    stadium_quality: 1.08,
    training_center_quality: 1.09,
    youth_academy_quality: 1.08,
    medical_center_quality: 1.07,
    administrative_center_quality: 1.06,
  },

  MAINTENANCE_PER_LEVEL: {
    stadium_capacity: 2,
    stadium_quality: 2_000,
    training_center_quality: 5_000,
    youth_academy_quality: 4_000,
    medical_center_quality: 3_500,
    administrative_center_quality: 2_500,
  },

  CONSTRUCTION_TIME: {
    BASE_DAYS: 10,
    LEVEL_MULTIPLIER: 0.3,
    STADIUM_SEAT_BATCH: 1000,
    STADIUM_DAYS_PER_BATCH: 5,
  },
};

export class InfrastructureEconomics {
  static getUpgradeCost(
    type: FacilityType,
    currentLevel: number,
    amount: number = 1
  ): number {
    if (type === "stadium_capacity") {
      const baseCost = CONFIG.BASE_UPGRADE_COSTS.stadium_capacity;
      const sizePenalty = currentLevel > 50000 ? 1.2 : 1.0;
      return Math.round(amount * baseCost * sizePenalty);
    }

    const base = CONFIG.BASE_UPGRADE_COSTS[type];
    const factor = CONFIG.GROWTH_FACTORS[type];

    return Math.round(base * Math.pow(factor, currentLevel));
  }

  static getMaintenanceCost(type: FacilityType, currentLevel: number): number {
    const rate = CONFIG.MAINTENANCE_PER_LEVEL[type];
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

  static getMaxLevel(type: FacilityType): number {
    return type === "stadium_capacity"
      ? CONFIG.LEVELS.STADIUM_CAPACITY_MAX
      : CONFIG.LEVELS.MAX;
  }

  static getMedicalBenefits(level: number): MedicalCenterBenefits {
    const reduction = Math.min(0.4, (level / 100) * 0.4);
    const speed = Math.min(0.5, (level / 100) * 0.5);

    return {
      injuryChanceReduction: reduction,
      recoverySpeedBonus: speed,
      description: `-${(reduction * 100).toFixed(1)}% chance lesão, +${(
        speed * 100
      ).toFixed(1)}% recup.`,
    };
  }

  static getAdminBenefits(level: number): AdminCenterBenefits {
    const sponsor = Math.min(1.0, (level / 100) * 1.0);
    const scouting = Math.min(0.5, (level / 100) * 0.5);

    return {
      sponsorshipBonus: sponsor,
      scoutingEfficiency: scouting,
      description: `+${(sponsor * 100).toFixed(0)}% $ patrocínio, +${(
        scouting * 100
      ).toFixed(0)}% scouting`,
    };
  }

  static getTrainingBenefits(level: number): TrainingCenterBenefits {
    const multiplier = 1 + (level / 100) * 1.0;

    return {
      xpMultiplier: multiplier,
      description: `+${((multiplier - 1) * 100).toFixed(0)}% XP Treino`,
    };
  }

  static getYouthBenefits(level: number): YouthAcademyBenefits {
    const minBonus = Math.floor((level / 100) * 15);
    const maxBonus = Math.floor((level / 100) * 25);

    return {
      minPotentialBonus: minBonus,
      maxPotentialBonus: maxBonus,
      description: `Potencial Base +${minBonus}, Teto +${maxBonus}`,
    };
  }

  static getStadiumQualityBenefits(level: number): StadiumBenefits {
    const priceBonus = (level / 100) * 2.0;
    const attendanceBonus = (level / 100) * 0.3;

    return {
      ticketPriceBonus: priceBonus,
      attendanceBonus: attendanceBonus,
      description: `Ingresso +${(priceBonus * 100).toFixed(
        0
      )}% valor, Público +${(attendanceBonus * 100).toFixed(0)}%`,
    };
  }

  static getBenefitDescription(type: FacilityType, level: number): string {
    switch (type) {
      case "stadium_capacity":
        return `${level.toLocaleString()} lugares`;
      case "stadium_quality":
        return this.getStadiumQualityBenefits(level).description;
      case "training_center_quality":
        return this.getTrainingBenefits(level).description;
      case "medical_center_quality":
        return this.getMedicalBenefits(level).description;
      case "youth_academy_quality":
        return this.getYouthBenefits(level).description;
      case "administrative_center_quality":
        return this.getAdminBenefits(level).description;
      default:
        return "N/A";
    }
  }
}
