import { GameState } from "../../core/models/gameState";
import {
  advanceOneDay,
  TimeAdvanceResult,
} from "../../core/systems/TimeSystem";

export const advanceDayAction = (
  set: (fn: (state: GameState) => void) => void
): TimeAdvanceResult => {
  let result: TimeAdvanceResult = {
    newDate: 0,
    matchesToday: [],
    events: [],
    stats: { expensesProcessed: 0, playersRecovered: 0 },
  };

  set((state) => {
    result = advanceOneDay(state);
  });

  return result;
};
