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
    FULL_MATCH_MINUTES: 90,
    KNOCKOUT_REST_DAYS: 14,
    TIE_BREAK_CHANCE: 50,
    REVENUE: {
      BASE_TICKET_PRICE: 50,
      MIN_SATISFACTION_MULTIPLIER: 0.3,
      MAX_SATISFACTION_MULTIPLIER: 1.0,
      ATTENDANCE_RANDOM_FACTOR_BASE: 0.95,
      ATTENDANCE_RANDOM_VARIANCE: 0.1,
      IMPORTANCE: {
        BASE: 1.0,
        TIER_1_BONUS: 1.2,
        KNOCKOUT_BONUS: 1.3,
        LATE_ROUND_BONUS: 1.2,
        MAX_MULTIPLIER: 2.0,
        TIER_1_CUP_BONUS: 1.1,
        LATE_ROUND_THRESHOLD: 30,
      },
    },
  },

  TRAINING: {
    MORAL: {
      NEUTRAL_THRESHOLD: 50,
      NATURAL_DECAY_RATE: 0.5,
      NATURAL_RECOVERY_RATE: 0.5,
    },
    ENERGY_COST: {
      REST: 15,
      PHYSICAL: -10,
      TACTICAL: -5,
      TECHNICAL: -7,
    },
    FITNESS_CHANGE: {
      REST: -1,
      PHYSICAL_BASE: 2,
      TACTICAL: 0,
      TECHNICAL: 1,
    },
    INJURY: {
      RISK_PER_MISSING_ENERGY_PERCENT: 0.05,
      PHYSICAL_TRAINING_PENALTY: 2,
      STAFF_MITIGATION_DIVISOR: 5,
    },
    GROWTH: {
      CHANCE_YOUTH_UNDER_21: 15,
      CHANCE_YOUNG_21_TO_25: 8,
      CHANCE_PRIME_OVER_25: 2,
    },
    STAFF_BONUS_TO_FITNESS_MULTIPLIER: 0.1,
  },

  MARKETING: {
    FAN_SATISFACTION: {
      WIN_BASE_GAIN: 2,
      LOSS_BASE_PENALTY: -3,
      DRAW_NEUTRAL: 0,
      HOME_WIN_BONUS: 1,
      HOME_LOSS_EXTRA_PENALTY: -1,
      REPUTATION_BONUS_DIVISOR: 1000,
      BIG_UPSET_THRESHOLD: 2000,
      UPSET_LOSS_MITIGATION: 1,
      DRAW_VS_STRONGER_THRESHOLD: 500,
      DRAW_VS_STRONGER_GAIN: 1,
      DRAW_VS_WEAKER_THRESHOLD: -500,
      DRAW_VS_WEAKER_PENALTY: -2,
      MAX_CHANGE_PER_MATCH: 5,
    },
    TICKET_PRICING: {
      BASE_FAIR_PRICE: 50,
      REPUTATION_TOLERANCE_DIVISOR: 1000,
      REPUTATION_PRICE_MULTIPLIER: 5,
      HIGH_PRICE_THRESHOLD: 1.5,
      HIGH_PRICE_PENALTY: -2,
      LOW_PRICE_THRESHOLD: 0.5,
      LOW_PRICE_BONUS: 1,
    },
  },

SCOUTING: {
    BASE_UNCERTAINTY: 15,
    REDUCTION_RATE: 0.1,
    DISCOVERY_CHANCE: {
      BASE: 0.5,
      PER_EFFICIENCY_POINT: 0.05,
    },
    PROGRESS: {
      SCOUT_OVERALL_DIVISOR: 10,
      DAILY_RANDOM_MIN: 1,
      DAILY_RANDOM_MAX: 5,
    },
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
    WAGE_RATIO_BASE: 0.06, 
    WAGE_RATIO_OVR_80: 0.045, 
    WAGE_RATIO_OVR_85: 0.035, 
    WAGE_RATIO_OVR_90: 0.025, 
    WAGE_MINIMUM_FLOOR: 12_000,
    AI_MIN_OFFER_RATIO: 0.7,
    AI_REJECT_COUNTER_RATIO: 0.9,
    AI_NEGOTIABLE_ZONE_MAX: 1.1,
    AI_ACCEPT_THRESHOLD: 1.3,
    AI_INSTANT_ACCEPT_THRESHOLD: 1.5,
    AI_COUNTER_LOW_MULTIPLIER_MIN: 1.15,
    AI_COUNTER_LOW_MULTIPLIER_MAX: 1.3,
    AI_COUNTER_HIGH_NUDGE: 1.1,
    AI_ACCEPT_CHANCE_CUTOFF: 0.7,
    GREED_SELLING_CLUB: 0.9,
    GREED_YOUTH_PROTECT: 1.2,
    GREED_VETERAN_SELL: 0.95,
    GREED_STAR_PROTECT: 1.3,
    PROPOSAL_RESPONSE_DAYS: 3,
    COUNTER_RESPONSE_DAYS: 2,
    PLAYER_MORAL_ON_TRANSFER: 85,
    VALIDATION: {
      MAX_INJURY_DAYS_FOR_TRANSFER: 30,
      BUDGET_WARNING_THRESHOLD: 500_000,
      FREE_AGENT_TEAM_ID: 0,
      CONTRACT_MIN_YEARS: 1,
      CONTRACT_MAX_YEARS: 5,
      LOAN_MAX_YEARS: 2,
      MAX_WAGE_HEURISTIC_MULTIPLIER: 10000,
      SQUAD_MAX_SIZE: 50,
      MAX_REASONABLE_FEE: 500_000_000,
    },
  },

  STAFF: {
    MEDICAL_MAX_REDUCTION: 0.4,
    FITNESS_ENERGY_RATE: 0.1,
    ASSISTANT_COACH_WEIGHT: 0.5,
    COACHING_CONVERSION_RATE: 0.2,
    YOUTH_DEVELOPMENT_RATE: 0.1,
  },

  INFRASTRUCTURE: {
    DEFAULT_CAPACITY: 10000,
    DEFAULT_QUALITY: 50,
  },

  CONTRACT: {
    MIN_WAGE_YOUTH: 100,
    MIN_WAGE_SENIOR: 500,
  },

  SEASON: {
    PROMOTION_RELEGATION_SLOTS: 4,
    TRANSFER_WINDOWS: [
      { startMonth: 0, startDay: 1, endMonth: 0, endDay: 31, name: "Janeiro" },
      { startMonth: 6, startDay: 1, endMonth: 6, endDay: 31, name: "Julho" },
    ],
    CALENDAR: {
      STATE_WINDOW: { start: "2025-01-20", end: "2025-04-30" },
      NATIONAL_WINDOW: { start: "2025-05-03", end: "2025-12-15" },
      CONTINENTAL_WINDOW: { start: "2025-05-07", end: "2025-11-30" },
      NATIONAL_GAME_DAYS: [0, 6],
      CONTINENTAL_GAME_DAYS: [3],
      DEFAULT_ROUND_STEP: 7,
      CONTINENTAL_ROUND_STEP: 14,
      CONTINENTAL_REST_DAYS: 2,
    },
  },

  FINANCE: {
    CRISIS_FINE_PERCENTAGE: 0.05,
    CRITICAL_DEBT: 5000000,
    WARNING_DEBT: 1000000,
  },

  SQUAD_ANALYSIS: {
    MONTHS_IN_YEAR: 12,
    TOP_PLAYERS_COUNT: 11,
    MAX_WAGE_RATIO: 0.3,
    CONTRACT_EXPIRING_DAYS: 182,

    MIN_BASE_OVR: 50,
    CRITICAL_THRESHOLD: 1,
    VETERAN_RATIO_WARNING: 0.4,
    OVERALL_GAP_THRESHOLD: 10,
    AGE_THRESHOLD_YOUNG: 23,
    AGE_THRESHOLD_VETERAN: 30,

    MIN_PLAYERS_PER_POSITION: {
      [Position.GK]: 2,
      [Position.DF]: 6,
      [Position.MF]: 6,
      [Position.FW]: 4,
    },
    OPTIMAL_PLAYERS_PER_POSITION: {
      [Position.GK]: 3,
      [Position.DF]: 8,
      [Position.MF]: 8,
      [Position.FW]: 6,
    },
    MAX_PLAYERS_PER_POSITION: {
      [Position.GK]: 4,
      [Position.DF]: 10,
      [Position.MF]: 10,
      [Position.FW]: 8,
    },

    CRITICAL_OVR_PENALTY: 10,
    CRITICAL_MAX_AGE: 35,
    CRITICAL_WAGE_RATIO: 0.5,
    HIGH_OVR_PENALTY: 5,
    HIGH_MAX_AGE: 30,
    HIGH_WAGE_RATIO: 0.4,
    MEDIUM_OVR_BONUS: 5,
    MEDIUM_MAX_AGE: 28,
    MEDIUM_WAGE_RATIO: 0.3,
    EMPTY_ANALYSIS_MAX_AGE: 35,
    EMPTY_ANALYSIS_MAX_WAGE_RATIO: 0.1,
    EMPTY_ANALYSIS_WAGEROOM_RATIO: 0.5,

    SELL_OVR_PENALTY: 5,
    SELL_OVR_WEIGHT: 2,
    SELL_AGE_WEIGHT: 5,
    SELL_EXPIRING_BONUS: 20,
    SELL_INJURED_BONUS: 10,

    FIT_SCORE_EXCELLENT: 80,
    FIT_SCORE_GOOD: 60,
    FIT_SCORE_ACCEPTABLE: 40,

    OVR_FIT_EXCELLENT_BONUS: 10,
    OVR_FIT_EXCELLENT_SCORE: 40,
    OVR_FIT_GOOD_BONUS: 5,
    OVR_FIT_GOOD_SCORE: 30,
    OVR_FIT_ACCEPTABLE_BONUS: 0,
    OVR_FIT_ACCEPTABLE_SCORE: 20,

    AGE_FIT_YOUNG_SCORE: 20,
    POTENTIAL_GAP_BONUS: 5,
    POTENTIAL_FIT_SCORE: 10,
    AGE_FIT_ACCEPTABLE_SCORE: 10,
    AGE_FIT_PENALTY: 10,

    OVR_AVG_BONUS: 15,
    CONDITION_MIN_OVR: 70,
    CONDITION_FIT_BONUS: 15,
    CONDITION_FIT_PENALTY: 10,
  },
} as const;

type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type GameBalanceConfig = DeepReadonly<typeof GameBalance>;

export const getBalanceValue = <K extends keyof typeof GameBalance>(
  category: K
): (typeof GameBalance)[K] => {
  return GameBalance[category];
};
