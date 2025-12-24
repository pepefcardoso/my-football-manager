import { Position, TransferStrategy } from "../enums";
import type { Player } from "../models";
import { GameBalance } from "../../engine/GameBalanceConfig";
import {
  FinancialBalance,
  type LeagueTier,
  type PlayerPosition,
} from "../../engine/FinancialBalanceConfig";

export interface WageBreakdown {
  baseSalary: number;
  grossSalary: number;
  components: {
    positionAdjustment: number;
    ageAdjustment: number;
    potentialBonus: number;
    formAdjustment: number;
    leagueMultiplier: number;
  };
}

export interface EvaluationResult {
  decision: "accept" | "reject" | "counter" | "negotiate";
  counterOfferFee?: number;
  reason: string;
}

export class TransferValuation {
  static calculateSuggestedWage(player: Player): number {
    const marketValue = this.calculateMarketValue(player);
    const wageRatio = GameBalance.TRANSFER.WAGE_RATIO_BASE || 0.1;
    return this.roundValue(marketValue * wageRatio, 500);
  }

  static calculateEconomicWage(
    player: Player,
    leagueTier: LeagueTier
  ): WageBreakdown {
    const economics = FinancialBalance.LEAGUE_ECONOMICS[leagueTier];
    const config = FinancialBalance.SALARY_CALCULATION;

    const leagueMultiplier = economics.AVG_PLAYER_SALARY / 2_500_000;
    const baseSalary = Math.round(
      Math.pow(player.overall, config.BASE_FORMULA.EXPONENT) *
        config.BASE_FORMULA.MULTIPLIER *
        leagueMultiplier
    );

    const posMult =
      config.POSITION_PREMIUMS[player.position as PlayerPosition] || 1.0;
    const positionAdjusted = baseSalary * posMult;

    const ageMult = this.getAgeMultiplier(player.age);
    const ageAdjusted = positionAdjusted * ageMult;

    const potentialBonus = this.calculatePotentialBonus(
      player.age,
      player.overall,
      player.potential,
      ageAdjusted
    );

    const formMult = this.getFormMultiplier(player.form);
    const finalRawSalary = (ageAdjusted + potentialBonus) * formMult;

    const grossSalary = Math.max(
      economics.MIN_PLAYER_SALARY,
      Math.min(economics.MAX_PLAYER_SALARY, Math.round(finalRawSalary))
    );

    return {
      baseSalary,
      grossSalary,
      components: {
        positionAdjustment: positionAdjusted - baseSalary,
        ageAdjustment: ageAdjusted - positionAdjusted,
        potentialBonus: potentialBonus,
        formAdjustment: finalRawSalary - (ageAdjusted + potentialBonus),
        leagueMultiplier,
      },
    };
  }

  static calculateMarketValue(player: Player): number {
    const TRANSFER = GameBalance.TRANSFER;

    const ovrDiff = Math.max(0, player.overall - 50);
    let value =
      TRANSFER.BASE_VALUE_50 * Math.pow(TRANSFER.OVR_MULTIPLIER, ovrDiff);

    const positionMultiplier =
      TRANSFER.POS_WEIGHTS[player.position as Position] || 1.0;
    value *= positionMultiplier;

    let ageMultiplier: number = TRANSFER.AGE_FACTORS.PRIME;
    if (player.age < 22) {
      ageMultiplier = TRANSFER.AGE_FACTORS.YOUNG;
      if (player.potential > player.overall) {
        const potentialBonus =
          (player.potential - player.overall) *
          TRANSFER.POTENTIAL_BONUS_PER_POINT;
        ageMultiplier += potentialBonus;
      }
    } else if (player.age >= 30 && player.age <= 33) {
      ageMultiplier = TRANSFER.AGE_FACTORS.VETERAN;
    } else if (player.age > 33) {
      ageMultiplier = TRANSFER.AGE_FACTORS.OLD;
    }
    value *= ageMultiplier;

    return this.roundValue(value);
  }

  static calculateTransferFee(
    player: Player,
    contractYearsLeft: number = 2
  ): number {
    const marketValue = this.calculateMarketValue(player);
    const CONTRACT_FACTORS = GameBalance.TRANSFER.CONTRACT_FACTORS;

    let contractMultiplier: number = 1.0;

    if (contractYearsLeft < 1) {
      contractMultiplier = CONTRACT_FACTORS.EXPIRING;
    } else if (contractYearsLeft <= 2) {
      contractMultiplier = CONTRACT_FACTORS.SHORT;
    } else {
      contractMultiplier = CONTRACT_FACTORS.LONG;
    }

    return this.roundValue(marketValue * contractMultiplier);
  }

  static evaluateOffer(
    player: Player,
    offerFee: number,
    sellingTeamStrategy: TransferStrategy | string = "balanced",
    contractYearsLeft: number = 2
  ): EvaluationResult {
    const TRANSFER = GameBalance.TRANSFER;
    const valuation = this.calculateTransferFee(player, contractYearsLeft);
    const offerRatio = offerFee / valuation;

    let greedFactor = 1.0;

    switch (sellingTeamStrategy) {
      case "selling_club":
        greedFactor = TRANSFER.GREED_SELLING_CLUB;
        break;
      case "youth_focused":
        if (player.age < 23) greedFactor = TRANSFER.GREED_YOUTH_PROTECT;
        else greedFactor = TRANSFER.GREED_VETERAN_SELL;
        break;
      case "aggressive":
      case "rebuilding":
        if (player.overall > 80) greedFactor = TRANSFER.GREED_STAR_PROTECT;
        break;
    }

    const adjustedRatio = offerRatio / greedFactor;

    if (adjustedRatio >= TRANSFER.AI_INSTANT_ACCEPT_THRESHOLD) {
      return {
        decision: "accept",
        reason:
          "A oferta é extraordinária e supera nossas melhores expectativas.",
      };
    }

    if (adjustedRatio < TRANSFER.AI_MIN_OFFER_RATIO) {
      return {
        decision: "reject",
        reason: "O valor oferecido é ofensivo para um jogador deste calibre.",
      };
    }

    if (adjustedRatio < TRANSFER.AI_REJECT_COUNTER_RATIO) {
      return {
        decision: "reject",
        reason: "A oferta está muito abaixo da nossa avaliação de mercado.",
      };
    }

    if (adjustedRatio < TRANSFER.AI_NEGOTIABLE_ZONE_MAX) {
      const range =
        TRANSFER.AI_COUNTER_LOW_MULTIPLIER_MAX -
        TRANSFER.AI_COUNTER_LOW_MULTIPLIER_MIN;
      const counterMultiplier =
        TRANSFER.AI_COUNTER_LOW_MULTIPLIER_MIN + Math.random() * range;
      const counter = this.roundValue(valuation * counterMultiplier);
      return {
        decision: "counter",
        counterOfferFee: counter,
        reason: "Estamos dispostos a negociar, mas esperamos um valor melhor.",
      };
    }

    if (adjustedRatio < TRANSFER.AI_ACCEPT_THRESHOLD) {
      if (Math.random() > TRANSFER.AI_ACCEPT_CHANCE_CUTOFF) {
        const counter = this.roundValue(
          offerFee * TRANSFER.AI_COUNTER_HIGH_NUDGE
        );
        return {
          decision: "counter",
          counterOfferFee: counter,
          reason: "Estamos quase lá. Subam um pouco a oferta e fechamos.",
        };
      }
    }

    return {
      decision: "accept",
      reason: "A proposta atende às nossas expectativas.",
    };
  }

  private static getAgeMultiplier(age: number): number {
    const adjustments = FinancialBalance.SALARY_CALCULATION.AGE_ADJUSTMENTS;

    if (age < 21) return adjustments.YOUTH_DISCOUNT;
    if (age >= 24 && age <= 29) return adjustments.PRIME_MULTIPLIER;
    if (age >= 30 && age <= 32) return adjustments.VETERAN_DISCOUNT;
    if (age >= 33) return adjustments.DECLINING_DISCOUNT;

    return (
      adjustments.YOUTH_DISCOUNT +
      ((adjustments.PRIME_MULTIPLIER - adjustments.YOUTH_DISCOUNT) *
        (age - 21)) /
        3
    );
  }

  private static calculatePotentialBonus(
    age: number,
    overall: number,
    potential: number,
    currentSalary: number
  ): number {
    if (age >= 24) return 0;

    const gap = potential - overall;
    const threshold =
      FinancialBalance.SALARY_CALCULATION.POTENTIAL_BONUS
        .HIGH_POTENTIAL_THRESHOLD;

    if (gap >= threshold) {
      const multiplier =
        FinancialBalance.SALARY_CALCULATION.POTENTIAL_BONUS.BONUS_MULTIPLIER;
      return Math.round(currentSalary * (multiplier - 1.0));
    }

    return 0;
  }

  private static getFormMultiplier(form: number): number {
    const impact = FinancialBalance.SALARY_CALCULATION.FORM_IMPACT;

    if (form > 80) return impact.EXCELLENT_FORM;
    if (form < 40) return impact.POOR_FORM;

    return 1.0;
  }

  private static roundValue(
    value: number,
    precision: number | null = null
  ): number {
    if (precision) {
      return Math.round(value / precision) * precision;
    }

    if (value < 1_000_000) {
      return Math.round(value / 10_000) * 10_000;
    } else if (value < 10_000_000) {
      return Math.round(value / 100_000) * 100_000;
    } else {
      return Math.round(value / 500_000) * 500_000;
    }
  }
}
