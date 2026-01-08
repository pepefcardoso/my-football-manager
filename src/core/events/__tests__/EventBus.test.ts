import { describe, it, expect, vi, beforeEach } from "vitest";
import { eventBus } from "../EventBus";
import { GameState } from "../../models/gameState";

describe("EventBus System", () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it("should return a functional unsubscribe callback", () => {
    // ARRANGE
    const handler = vi.fn();
    const eventName = "MATCH_FINISHED";
    const mockState = {} as GameState;
    const mockPayload = { matchId: "1", homeScore: 1, awayScore: 0 };

    // ACT
    const unsubscribe = eventBus.on(eventName, handler);

    // ACT 2: Emit (Should trigger)
    eventBus.emit(mockState, eventName, mockPayload);

    // ASSERT
    expect(handler).toHaveBeenCalledTimes(1);

    // ACT 3: Unsubscribe
    unsubscribe();

    // ACT 4: Emit again (Should NOT trigger)
    eventBus.emit(mockState, eventName, mockPayload);

    // ASSERT 2
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should handle multiple listeners for the same event independently", () => {
    // ARRANGE
    const handlerA = vi.fn();
    const handlerB = vi.fn();
    const eventName = "MATCH_FINISHED";
    const mockState = {} as GameState;

    // ACT
    const unsubA = eventBus.on(eventName, handlerA);
    eventBus.on(eventName, handlerB);

    unsubA();

    eventBus.emit(mockState, eventName, {
      matchId: "1",
      homeScore: 0,
      awayScore: 0,
    });

    // ASSERT
    expect(handlerA).not.toHaveBeenCalled();
    expect(handlerB).toHaveBeenCalled();
  });
});
