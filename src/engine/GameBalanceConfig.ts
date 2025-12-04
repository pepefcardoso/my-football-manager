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
    BASE_CHANCE_EVENT: 15,
    BASE_CHANCE_ATTACK: 20,
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
};
