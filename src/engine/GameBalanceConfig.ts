import { Position } from "../domain/enums";
import type { PlayerAttributes } from "../domain/types";

export const GameBalance = {
  ATTRIBUTE_WEIGHTS: {
    [Position.GK]: {
      defending: 4,
      physical: 2,
      passing: 1,
      finishing: 0,
      dribbling: 0,
      pace: 1,
      shooting: 0,
    },
    [Position.DF]: {
      defending: 4,
      physical: 3,
      passing: 2,
      finishing: 0,
      dribbling: 1,
      pace: 2,
      shooting: 0,
    },
    [Position.MF]: {
      defending: 2,
      physical: 2,
      passing: 4,
      finishing: 1,
      dribbling: 3,
      pace: 2,
      shooting: 1,
    },
    [Position.FW]: {
      defending: 0,
      physical: 2,
      passing: 1,
      finishing: 4,
      dribbling: 3,
      pace: 3,
      shooting: 3,
    },
  } as Record<Position, PlayerAttributes>,

  MATCH: {
    HOME_ADVANTAGE: 1.05,
    ATTACK_CHANCE_PER_MINUTE: 22,
    RANDOM_EVENT_CHANCE_PER_MINUTE: 3.5,
    SHOT_CHANCE_IN_ATTACK: 45,
    SHOT_ACCURACY_BASE: 0.55,
    SAVE_CHANCE_BASE: 40,
    VAR_CHECK_PROBABILITY: 10,
    VAR_OVERTURN_PROBABILITY: 30,
    OFFSIDE_IN_GOAL_PROBABILITY: 12,
    CORNER_CHANCE: 8,
    WEATHER_PENALTY: {
      sunny: 1.0,
      cloudy: 1.0,
      rainy: 0.9,
      windy: 0.95,
      snowy: 0.85,
    },
  },

  TRAINING: {
    GROWTH_CHANCE_YOUNG: 5,
    DECLINE_CHANCE_OLD: 2,
  },

  TRANSFER: {
    BASE_VALUE_50: 50_000,
    OVR_MULTIPLIER: 1.14,
    POTENTIAL_BONUS_PER_POINT: 0.05,

    POS_WEIGHTS: {
      [Position.FW]: 1.15,
      [Position.MF]: 1.1,
      [Position.DF]: 1.0,
      [Position.GK]: 0.9,
    },

    AGE_FACTORS: {
      YOUNG: 1.3,
      PRIME: 1.0,
      VETERAN: 0.7,
      OLD: 0.4,
    },

    CONTRACT_FACTORS: {
      EXPIRING: 0.6,
      SHORT: 0.9,
      LONG: 1.2,
    },

    WAGE_RATIO_BASE: 0.1,
    WAGE_RATIO_OVR_80: 0.08,
    WAGE_RATIO_OVR_85: 0.06,
    WAGE_RATIO_OVR_90: 0.05,
    WAGE_MINIMUM_FLOOR: 12_000,

    AI_MIN_OFFER_RATIO: 0.7,
    AI_REJECT_COUNTER_RATIO: 0.9,
    AI_NEGOTIABLE_ZONE_MAX: 1.1,
    AI_ACCEPT_THRESHOLD: 1.3,

    AI_COUNTER_LOW_MULTIPLIER_MIN: 1.15,
    AI_COUNTER_LOW_MULTIPLIER_MAX: 1.3,
    AI_COUNTER_HIGH_NUDGE: 1.1,
    AI_ACCEPT_CHANCE_CUTOFF: 0.7,

    GREED_SELLING_CLUB: 0.9,
    GREED_YOUTH_PROTECT: 1.2,
    GREED_VETERAN_SELL: 0.95,
    GREED_STAR_PROTECT: 1.3,
  },
};
