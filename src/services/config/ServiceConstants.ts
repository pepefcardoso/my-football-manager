/**
 * Define os limiares para alertas financeiros e crises.
 */
export const FinancialThresholds = {
  CRITICAL_DEBT: 5000000,
  WARNING_DEBT: 1000000,
} as const;

/**
 * Pesos e valores para penalidades aplicadas ao clube.
 */
export const PenaltyWeights = {
  MORAL_CRITICAL: -15,
  MORAL_WARNING: -10,
  POINTS_DEDUCTION: 3,
  FINE_PERCENTAGE: 0.05,
  SATISFACTION_PENALTY_CRITICAL: -15,
  SATISFACTION_PENALTY_WARNING: -10,
} as const;

/**
 * Configurações relacionadas à geração de receita e importância de partidas.
 */
export const MatchRevenueConfig = {
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
  },
} as const;

/**
 * Custos e valores relacionados à infraestrutura (Estádio, CT, Base).
 */
export const InfrastructureCosts = {
  SEAT_EXPANSION_BLOCK: 1000,
  SEAT_COST_PER_UNIT: 500,
  QUALITY_UPGRADE_BLOCK: 5,
  QUALITY_COST_BASE: 200000,
  MAINTENANCE_COST_PER_SEAT: 2,
  MAINTENANCE_QUALITY_MULTIPLIER: 1000,
  MAX_QUALITY: 100,
} as const;
