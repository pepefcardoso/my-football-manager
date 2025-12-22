import type { Player } from "../domain/models";
import { TrainingFocus } from "../domain/enums";
import { getBalanceValue } from "./GameBalanceConfig";

const TRAINING_CONFIG = getBalanceValue("TRAINING");
const INJURY_CONFIG = TRAINING_CONFIG.INJURY;

export class PhysiologyEngine {
  static calculateEnergyRecovery(
    player: Player,
    trainingFocus: TrainingFocus,
    staffEnergyBonus: number,
    facilityRecoveryBonus: number = 0
  ): number {
    let baseDelta = 0;

    switch (trainingFocus) {
      case TrainingFocus.REST:
        baseDelta = TRAINING_CONFIG.ENERGY_COST.REST;
        break;
      case TrainingFocus.PHYSICAL:
        baseDelta = TRAINING_CONFIG.ENERGY_COST.PHYSICAL;
        break;
      case TrainingFocus.TACTICAL:
        baseDelta = TRAINING_CONFIG.ENERGY_COST.TACTICAL;
        break;
      case TrainingFocus.TECHNICAL:
        baseDelta = TRAINING_CONFIG.ENERGY_COST.TECHNICAL;
        break;
    }

    const totalBonus =
      staffEnergyBonus +
      (baseDelta > 0 ? baseDelta * facilityRecoveryBonus : 0);

    return Math.max(0, Math.min(100, player.energy + baseDelta + totalBonus));
  }

  static processInjuryHealing(
    player: Player,
    injuryRecoveryMultiplier: number,
    facilitySpeedBonus: number = 0
  ): { isHealed: boolean; daysRemaining: number } {
    if (!player.isInjured) return { isHealed: false, daysRemaining: 0 };

    let reduction = 1;
    const bonusChance = 1.0 - injuryRecoveryMultiplier + facilitySpeedBonus;

    if (Math.random() < bonusChance) {
      reduction += 1;
    }

    if (facilitySpeedBonus > 0.4 && Math.random() < 0.2) {
      reduction += 1;
    }

    const newDays = Math.max(0, player.injuryDaysRemaining - reduction);

    return {
      isHealed: newDays === 0,
      daysRemaining: newDays,
    };
  }

  static calculateInjuryRisk(
    player: Player,
    trainingFocus: TrainingFocus,
    staffEnergyBonus: number,
    facilityPreventionBonus: number = 0
  ): number {
    if (trainingFocus === TrainingFocus.REST) {
      return 0;
    }

    let risk =
      (100 - player.energy) * INJURY_CONFIG.RISK_PER_MISSING_ENERGY_PERCENT;

    if (trainingFocus === TrainingFocus.PHYSICAL) {
      risk += INJURY_CONFIG.PHYSICAL_TRAINING_PENALTY;
    }

    const mitigation =
      staffEnergyBonus / INJURY_CONFIG.STAFF_MITIGATION_DIVISOR;

    risk = Math.max(0, risk - mitigation);
    risk = risk * (1 - facilityPreventionBonus);

    return risk;
  }

  static calculateFitnessChange(
    player: Player,
    trainingFocus: TrainingFocus,
    staffEnergyBonus: number
  ): number {
    let baseDelta = 0;
    switch (trainingFocus) {
      case TrainingFocus.REST:
        baseDelta = TRAINING_CONFIG.FITNESS_CHANGE.REST;
        break;
      case TrainingFocus.PHYSICAL:
        baseDelta = TRAINING_CONFIG.FITNESS_CHANGE.PHYSICAL_BASE;
        break;
      case TrainingFocus.TACTICAL:
        baseDelta = TRAINING_CONFIG.FITNESS_CHANGE.TACTICAL;
        break;
      case TrainingFocus.TECHNICAL:
        baseDelta = TRAINING_CONFIG.FITNESS_CHANGE.TECHNICAL;
        break;
    }
    const bonusDelta =
      staffEnergyBonus * TRAINING_CONFIG.STAFF_BONUS_TO_FITNESS_MULTIPLIER;
    return Math.max(0, Math.min(100, player.fitness + baseDelta + bonusDelta));
  }
}
