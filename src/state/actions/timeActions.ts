import { eventBus } from "../../core/events/EventBus";
import { GameState } from "../../core/models/gameState";
import { processDailyNotifications } from "../../core/systems/NotificationSystem";
import {
  advanceOneDay,
  TimeAdvanceResult,
} from "../../core/systems/TimeSystem";

type SetState = (fn: (state: GameState) => Promise<void> | void) => void;

export const advanceDayAction = async (
  set: SetState
): Promise<TimeAdvanceResult> => {
  let result: TimeAdvanceResult | undefined;

  await set(async (state) => {
    result = await advanceOneDay(state);

    const newNotifications = processDailyNotifications(state);

    newNotifications.forEach((notification) => {
      eventBus.emit(state, "NOTIFICATION_CREATED", { notification });
    });
  });

  if (!result)
    throw new Error("Falha crítica ao avançar o dia: Resultado indefinido.");

  return result;
};
