import type {
  AdminCenterBenefits,
  FacilityType,
  MedicalCenterBenefits,
  StadiumBenefits,
  TrainingCenterBenefits,
  YouthAcademyBenefits,
} from "../domain/types/InfrastructureTypes";
import { RandomEngine } from "./RandomEngine";

const CONFIG = {
  LEVELS: {
    MIN: 0,
    MAX: 100,
    STADIUM_CAPACITY_MAX: 105000,
  },

  COSTS: {
    SEAT_PRICE: 4500,
    QUALITY_BASE_PER_1K_SEATS: 800,
    FACILITY_BASE: 15000,
    GROWTH_FACTOR: 1.05,
  },

  MAINTENANCE_PER_LEVEL: {
    stadium_capacity: 5,
    stadium_quality: 1000,
    training_center_quality: 2000,
    youth_academy_quality: 1500,
    medical_center_quality: 1500,
    administrative_center_quality: 1000,
  },

  CONSTRUCTION_TIME: {
    BASE_DAYS: 7,
    LEVEL_MULTIPLIER: 0.2,
    STADIUM_SEAT_BATCH: 2000,
    STADIUM_DAYS_PER_BATCH: 10,
  },
};

export class InfrastructureEconomics {
  static getUpgradeCost(
    type: FacilityType,
    currentLevel: number,
    amount: number = 1,
    stadiumCapacity: number = 10000
  ): number {
    if (type === "stadium_capacity") {
      return Math.round(amount * CONFIG.COSTS.SEAT_PRICE);
    }

    if (type === "stadium_quality") {
      return this.getStadiumQualityUpgradeCost(currentLevel, stadiumCapacity);
    }

    const base = CONFIG.COSTS.FACILITY_BASE;
    return Math.round(
      base * Math.pow(CONFIG.COSTS.GROWTH_FACTOR, currentLevel)
    );
  }

  static getMaxStadiumCapacity(): number {
    return CONFIG.LEVELS.STADIUM_CAPACITY_MAX;
  }

  static getMaxFacilityLevel(): number {
    return CONFIG.LEVELS.MAX;
  }

  static getStadiumQualityUpgradeCost(
    currentQuality: number,
    stadiumCapacity: number
  ): number {
    const capacityUnits = Math.max(1, Math.round(stadiumCapacity / 1000));
    const baseCost = CONFIG.COSTS.QUALITY_BASE_PER_1K_SEATS * capacityUnits;
    return Math.round(baseCost * Math.pow(1.02, currentQuality));
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
        10,
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

  static calculateAnnualDegradation(currentLevel: number): number {
    if (currentLevel <= 0) return 0;
    if (currentLevel >= 90) return RandomEngine.getInt(5, 7);
    if (currentLevel >= 70) return RandomEngine.getInt(3, 5);
    if (currentLevel >= 30) return RandomEngine.getInt(2, 3);
    return 1;
  }

  static validateDowngrade(currentLevel: number, amount: number): boolean {
    return currentLevel - amount >= 0;
  }
}
