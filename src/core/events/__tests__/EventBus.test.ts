import { describe, it, expect, vi, beforeEach } from "vitest";
import { eventBus } from "../EventBus";
import { GameState } from "../../models/gameState";
import { logger } from "../../utils/Logger";

describe("EventBus System (Architecture V2)", () => {
  const mockState = {} as GameState;

  beforeEach(() => {
    eventBus.clear();
    vi.clearAllMocks();
  });

  it("should return a functional unsubscribe callback (Standard Flow)", () => {
    // ARRANGE
    const handler = vi.fn();
    const eventName = "MATCH_FINISHED";
    const mockPayload = { matchId: "1", homeScore: 1, awayScore: 0 };

    // ACT
    const unsubscribe = eventBus.on(eventName, handler);
    eventBus.emit(mockState, eventName, mockPayload);

    // ASSERT
    expect(handler).toHaveBeenCalledTimes(1);

    // ACT 2
    unsubscribe();
    eventBus.emit(mockState, eventName, mockPayload);

    // ASSERT 2
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should perform proactive garbage collection (Memory Safety)", () => {
    // ARRANGE
    const handler = vi.fn();
    const eventName = "PLAYER_INJURY_OCCURRED";

    // ACT
    const unsubscribe = eventBus.on(eventName, handler);

    expect(eventBus.hasKey(eventName)).toBe(true);
    expect(eventBus.getListenerCount(eventName)).toBe(1);

    unsubscribe();

    // ASSERT
    expect(eventBus.getListenerCount(eventName)).toBe(0);
    expect(eventBus.hasKey(eventName)).toBe(false);
  });

  it("should prevent duplicate listeners (Set Behavior)", () => {
    // ARRANGE
    const handler = vi.fn();
    const eventName = "FINANCIAL_CRISIS_WARNING";

    // ACT
    eventBus.on(eventName, handler);
    eventBus.on(eventName, handler);
    eventBus.on(eventName, handler);

    // ASSERT
    expect(eventBus.getListenerCount(eventName)).toBe(1);
  });

  it("should isolate errors and continue processing other listeners", () => {
    // ARRANGE
    const loggerSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const safeHandler = vi.fn();
    const brokenHandler = vi.fn(() => {
      throw new Error("I am broken");
    });
    const eventName = "NOTIFICATION_CREATED";

    // ACT
    eventBus.on(eventName, brokenHandler);
    eventBus.on(eventName, safeHandler);

    eventBus.emit(mockState, eventName, {} as any);

    // ASSERT
    expect(safeHandler).toHaveBeenCalled();
    expect(brokenHandler).toHaveBeenCalled();
    expect(loggerSpy).toHaveBeenCalledWith(
      "EventBus",
      expect.stringContaining("Erro crítico"),
      expect.any(Error)
    );
  });
});
