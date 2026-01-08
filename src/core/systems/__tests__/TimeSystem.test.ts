import { describe, it, expect, vi, beforeEach } from "vitest";
import { advanceOneDay } from "../TimeSystem";
import { GameState } from "../../models/gameState";
import * as EconomySystem from "../EconomySystem";
import * as RecoverySystem from "../RecoverySystem";
import * as MatchSystem from "../MatchSystem";

vi.mock("../EconomySystem", () => ({
  processDailyEconomy: vi.fn(() => ({
    dailyExpenses: 500,
    logs: ["Despesas pagas"],
  })),
}));

vi.mock("../RecoverySystem", () => ({
  processDailyRecovery: vi.fn(() => ({
    recoveredPlayers: ["Player1"],
    logs: ["Jogador recuperado"],
  })),
}));

vi.mock("../TrainingSystem", () => ({
  processDailyTraining: vi.fn(() => ({ improvedAttributes: 0 })),
}));

vi.mock("../MatchSystem", () => ({
  processScheduledMatches: vi.fn(() => ({ matchesToday: [] })),
}));

describe("TimeSystem Core Logic", () => {
  let mockState: GameState;
  const INITIAL_DATE = new Date("2024-01-01T12:00:00Z").getTime();

  beforeEach(() => {
    vi.clearAllMocks();

    mockState = {
      meta: {
        currentDate: INITIAL_DATE,
        updatedAt: INITIAL_DATE,
      },
      system: {
        notifications: {},
      },
      market: {
        contracts: {},
      },
    } as unknown as GameState;
  });

  it("should advance exactly 24 hours", () => {
    const result = advanceOneDay(mockState);

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    expect(result.newDate).toBe(INITIAL_DATE + ONE_DAY_MS);
    expect(mockState.meta.currentDate).toBe(INITIAL_DATE + ONE_DAY_MS);
  });

  it("should orchestrate all subsystems correctly", () => {
    advanceOneDay(mockState);

    expect(EconomySystem.processDailyEconomy).toHaveBeenCalledWith(mockState);
    expect(RecoverySystem.processDailyRecovery).toHaveBeenCalledWith(mockState);
    expect(MatchSystem.processScheduledMatches).toHaveBeenCalledWith(mockState);
  });

  it("should aggregate logs from subsystems", () => {
    const result = advanceOneDay(mockState);

    expect(result.events).toContain("Despesas pagas");
    expect(result.events).toContain("Jogador recuperado");
  });

  it("should return correct statistics structure", () => {
    const result = advanceOneDay(mockState);

    expect(result.stats.expensesProcessed).toBe(500);
    expect(result.stats.playersRecovered).toBe(1);
  });
});
