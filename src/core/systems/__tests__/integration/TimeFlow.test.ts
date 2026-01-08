import { describe, it, expect, beforeEach, vi } from "vitest";
import { advanceOneDay } from "../../TimeSystem";
import { createNewGame } from "../../../../data/initialSetup";
import { GameState } from "../../../../core/models/gameState";

describe("TimeFlow Integration (The Game Loop)", () => {
  let state: GameState;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  beforeEach(() => {
    vi.useFakeTimers();
    state = createNewGame();
  });

  it("should execute a full day cycle affecting multiple domains (Finance, Time, Recovery)", () => {
    // ARRANGE
    const userClubId = state.meta.userClubId!;
    const initialDate = state.meta.currentDate;
    const initialBalance = state.clubs.finances[userClubId].balanceCurrent;

    const playerIds = Object.keys(state.people.players);
    const testPlayerId = playerIds[0];

    if (!state.people.playerStates[testPlayerId]) {
      state.people.playerStates[testPlayerId] = {
        playerId: testPlayerId,
        fitness: 50,
        morale: 50,
        matchReadiness: 100,
      };
    }
    state.people.playerStates[testPlayerId].fitness = 50;

    // ACT
    const result = advanceOneDay(state);

    // ASSERT
    expect(result.newDate).toBe(initialDate + ONE_DAY_MS);
    expect(state.clubs.finances[userClubId].balanceCurrent).toBeLessThan(
      initialBalance
    );
    expect(state.people.playerStates[testPlayerId].fitness).toBeGreaterThan(50);
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events.some((e) => e.includes("Custos de manutenção"))).toBe(
      true
    );
  });

  it("should advance multiple days consistently", () => {
    const DAYS_TO_SIMULATE = 5;
    const initialDate = state.meta.currentDate;

    for (let i = 0; i < DAYS_TO_SIMULATE; i++) {
      advanceOneDay(state);
    }

    const expectedDate = initialDate + DAYS_TO_SIMULATE * ONE_DAY_MS;
    expect(state.meta.currentDate).toBe(expectedDate);
  });
});
