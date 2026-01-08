import { z } from "zod";
import { logger } from "../utils/Logger";

const RatingWeightsSchema = z.object({
  GOAL: z.number().positive().describe("Peso por golo marcado"),
  ASSIST: z.number().positive().describe("Peso por assistência"),
  SHOT_ON_TARGET: z.number().positive().describe("Peso por remate à baliza"),
  KEY_PASS: z.number().positive().describe("Peso por passe decisivo"),
  TACKLE: z.number().positive().describe("Peso por desarme"),
  SAVE: z.number().positive().describe("Peso por defesa (Goleiro)"),
  CLEANSHEET: z
    .number()
    .positive()
    .describe("Bônus por não sofrer golos (Def/GK)"),
  YELLOW_CARD: z.number().negative().describe("Penalidade por cartão amarelo"),
  RED_CARD: z.number().negative().describe("Penalidade por cartão vermelho"),
  OWN_GOAL: z.number().negative().describe("Penalidade por golo contra"),
  ERROR: z.number().negative().describe("Penalidade por erro individual grave"),
});

const ProbabilitiesSchema = z.object({
  INJURY_BASE: z
    .number()
    .min(0)
    .max(100)
    .describe("Chance base de lesão por tick"),
  FOUL_BASE: z
    .number()
    .min(0)
    .max(100)
    .describe("Chance base de falta por tick"),
  ATTACK_BASE: z
    .number()
    .min(0)
    .max(100)
    .describe("Chance base de iniciar jogada ofensiva"),
  YELLOW_CARD: z
    .number()
    .min(0)
    .max(100)
    .describe("Chance de amarelo ao cometer falta"),
  RED_CARD: z
    .number()
    .min(0)
    .max(100)
    .describe("Chance de vermelho ao cometer falta"),
  ASSIST: z
    .number()
    .min(0)
    .max(100)
    .describe("Chance de um golo ter assistência"),
});

const ThresholdsSchema = z.object({
  GOAL: z.number().describe("Diferença necessária para resultar em golo"),
  SAVE: z.number().describe("Diferença necessária para resultar em defesa"),
});

const MomentumSchema = z.object({
  AFTER_GOAL_HOME: z
    .number()
    .min(0)
    .max(100)
    .describe("Momentum definido após golo da casa"),
  AFTER_GOAL_AWAY: z
    .number()
    .min(0)
    .max(100)
    .describe("Momentum definido após golo visitante"),
});

const StoppageTimeSchema = z
  .object({
    MIN_H1: z.number().int().min(0),
    MAX_H1: z.number().int().min(0),
    MIN_H2: z.number().int().min(0),
    MAX_H2: z.number().int().min(0),
  })
  .refine((data) => data.MAX_H1 >= data.MIN_H1 && data.MAX_H2 >= data.MIN_H2, {
    message: "O tempo máximo de acréscimo deve ser maior ou igual ao mínimo.",
  });

export const MatchConfigSchema = z.object({
  RATING_WEIGHTS: RatingWeightsSchema,
  PROBABILITIES: ProbabilitiesSchema,
  THRESHOLDS: ThresholdsSchema,
  MOMENTUM: MomentumSchema,
  STOPPAGE_TIME: StoppageTimeSchema,
});

export type MatchConfig = z.infer<typeof MatchConfigSchema>;

const RAW_CONFIG: MatchConfig = {
  RATING_WEIGHTS: {
    GOAL: 1.0,
    ASSIST: 0.8,
    SHOT_ON_TARGET: 0.2,
    KEY_PASS: 0.1,
    TACKLE: 0.1,
    SAVE: 0.5,
    CLEANSHEET: 0.5,
    YELLOW_CARD: -0.5,
    RED_CARD: -2.0,
    OWN_GOAL: -2.0,
    ERROR: -0.3,
  },
  PROBABILITIES: {
    INJURY_BASE: 0.05,
    FOUL_BASE: 4.0,
    ATTACK_BASE: 15.0,
    YELLOW_CARD: 10.0,
    RED_CARD: 1.0,
    ASSIST: 70.0,
  },
  THRESHOLDS: {
    GOAL: 12,
    SAVE: -10,
  },
  MOMENTUM: {
    AFTER_GOAL_HOME: 40,
    AFTER_GOAL_AWAY: 60,
  },
  STOPPAGE_TIME: {
    MIN_H1: 0,
    MAX_H1: 3,
    MIN_H2: 2,
    MAX_H2: 6,
  },
};

export const validateMatchEngineConfig = (): void => {
  try {
    MatchConfigSchema.parse(RAW_CONFIG);
    logger.info(
      "MatchEngine",
      "Configuração carregada e validada com sucesso."
    );
  } catch (error) {
    logger.error(
      "MatchEngine",
      "❌ ERRO CRÍTICO NA CONFIGURAÇÃO DO MOTOR",
      error
    );
    if (process.env.NODE_ENV === "development") {
      throw error;
    }
  }
};

const VALIDATED_CONFIG = MatchConfigSchema.parse(RAW_CONFIG);

export const MATCH_CONFIG = Object.freeze(VALIDATED_CONFIG);
