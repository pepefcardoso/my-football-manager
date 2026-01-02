import { GameState } from "../models/gameState";

export interface TrainingResult {
  improvedAttributes: number;
}

export const processDailyTraining = (state: GameState): TrainingResult => {
  return { improvedAttributes: 0 };
};
