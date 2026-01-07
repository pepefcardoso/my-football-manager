export const MATCH_CONFIG = {
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
  },
  STOPPAGE_TIME: {
    MIN_H1: 0,
    MAX_H1: 3,
    MIN_H2: 2,
    MAX_H2: 6,
  },
};
