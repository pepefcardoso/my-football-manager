import { eventBus } from "../../core/events/EventBus";
import { GameState } from "../../core/models/gameState";
import { processDailyNotifications } from "../../core/systems/NotificationSystem";
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

    const newNotifications = processDailyNotifications(state);

    newNotifications.forEach((notification) => {
      eventBus.emit(state, "NOTIFICATION_CREATED", { notification });
    });
  });

  return result;
};
