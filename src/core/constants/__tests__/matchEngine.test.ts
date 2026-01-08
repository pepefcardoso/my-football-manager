import { describe, it, expect } from "vitest";
import { MatchConfigSchema } from "../matchEngine";

describe("MatchEngine Configuration (Schema)", () => {
  it("should validate a correct configuration", () => {
    const validConfig = {
      RATING_WEIGHTS: {
        GOAL: 1.0,
        ASSIST: 0.5,
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
        MIN_H1: 1,
        MAX_H1: 3,
        MIN_H2: 2,
        MAX_H2: 5,
      },
    };

    const result = MatchConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it("should reject percentages outside 0-100 range", () => {
    const ProbSchema = MatchConfigSchema.shape.PROBABILITIES;
    const result = ProbSchema.safeParse({
      INJURY_BASE: 150,
      FOUL_BASE: 0,
      ATTACK_BASE: 0,
      YELLOW_CARD: 0,
      RED_CARD: 0,
      ASSIST: 0,
    });

    expect(result.success).toBe(false);
  });

  it("should reject stoppage time if MIN > MAX", () => {
    const StoppageSchema = MatchConfigSchema.shape.STOPPAGE_TIME;
    const result = StoppageSchema.safeParse({
      MIN_H1: 5,
      MAX_H1: 2,
      MIN_H2: 0,
      MAX_H2: 0,
    });

    expect(result.success).toBe(false);
  });

  it("should enforce positive values for positive rating weights", () => {
    const RatingSchema = MatchConfigSchema.shape.RATING_WEIGHTS;
    const result = RatingSchema.safeParse({
      GOAL: -1.0,
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
    });

    expect(result.success).toBe(false);
  });
});