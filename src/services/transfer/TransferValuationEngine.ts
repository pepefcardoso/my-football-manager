import { Position, TransferStrategy } from "../../domain/enums";
import type { Player } from "../../domain/models";
import { GameBalance } from "../../engine/GameBalanceConfig";

/**
 * Result of a transfer offer evaluation.
 */
export interface EvaluationResult {
  decision: "accept" | "reject" | "counter" | "negotiate";
  counterOfferFee?: number;
  reason: string;
}

export class TransferValuationEngine {
  /**
   * Calculates the estimated market value of a player.
   */
  static calculateMarketValue(player: Player): number {
    const TRANSFER = GameBalance.TRANSFER;

    const ovrDiff = Math.max(0, player.overall - 50);
    let value =
      TRANSFER.BASE_VALUE_50 * Math.pow(TRANSFER.OVR_MULTIPLIER, ovrDiff);

    const positionMultiplier =
      TRANSFER.POS_WEIGHTS[player.position as Position] || 1.0;
    value *= positionMultiplier;

    let ageMultiplier = TRANSFER.AGE_FACTORS.PRIME;
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

  /**
   * Calculates the transfer fee a club would demand.
   * This is Market Value + Contract Premium.
   */
  static calculateTransferFee(
    player: Player,
    contractYearsLeft: number = 2
  ): number {
    const marketValue = this.calculateMarketValue(player);
    const CONTRACT_FACTORS = GameBalance.TRANSFER.CONTRACT_FACTORS;

    let contractMultiplier = 1.0;

    if (contractYearsLeft < 1) {
      contractMultiplier = CONTRACT_FACTORS.EXPIRING;
    } else if (contractYearsLeft <= 2) {
      contractMultiplier = CONTRACT_FACTORS.SHORT;
    } else {
      contractMultiplier = CONTRACT_FACTORS.LONG;
    }

    return this.roundValue(marketValue * contractMultiplier);
  }

  /**
   * Calculates a suggested annual wage for a player based on their value and age.
   */
  static calculateSuggestedWage(player: Player): number {
    const marketValue = this.calculateMarketValue(player);
    const TRANSFER = GameBalance.TRANSFER;

    let ratio = TRANSFER.WAGE_RATIO_BASE;
    if (player.overall > 90) ratio = TRANSFER.WAGE_RATIO_OVR_90;
    else if (player.overall > 85) ratio = TRANSFER.WAGE_RATIO_OVR_85;
    else if (player.overall > 80) ratio = TRANSFER.WAGE_RATIO_OVR_80;

    let annualWage = marketValue * ratio;

    if (annualWage < TRANSFER.WAGE_MINIMUM_FLOOR)
      annualWage = TRANSFER.WAGE_MINIMUM_FLOOR;

    return this.roundValue(annualWage, 100);
  }

  /**
   * Evaluates an incoming transfer offer on behalf of the AI Team.
   */
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
      return {
        decision: "accept",
        reason: "A proposta atende às nossas expectativas.",
      };
    }

    return {
      decision: "accept",
      reason: "É uma oferta excelente que não podemos recusar.",
    };
  }

  /**
   * Helper to round financial values to look realistic
   */
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
