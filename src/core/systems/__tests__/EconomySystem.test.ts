import { describe, it, expect } from "vitest";
import { processDailyEconomy } from "../EconomySystem";
import { GameState } from "../../models/gameState";
import { ClubFinances, ClubInfra } from "../../models/club";

const createMockState = (
  clubId: string,
  infraLevels: { training: number; youth: number; medical: number },
  initialBalance: number
): GameState => {
  return {
    clubInfras: {
      [clubId]: {
        clubId,
        trainingCenterLevel: infraLevels.training,
        youthAcademyLevel: infraLevels.youth,
        medicalCenterLevel: infraLevels.medical,
        stadiumId: "stadium-1",
        dataAnalysisCenterLevel: 1,
        administrationLevel: 1,
        reserveStadiumId: "reserve-1",
      } as ClubInfra,
    },
    clubFinances: {
      [clubId]: {
        clubId,
        balanceCurrent: initialBalance,
        debtHistorical: 0,
        debtInterestRate: 0,
        accumulatedManagementBalance: 0,
        monthlyMembershipRevenue: 0,
      } as ClubFinances,
    },
    meta: {},
    players: {},
  } as unknown as GameState;
};

describe("EconomySystem (Unit)", () => {
  const CLUB_ID = "test-club-fc";
  const MAINTENANCE_COST_PER_LEVEL = 100;

  it("should calculate daily maintenance expenses correctly", () => {
    // ARRANGE
    const levels = { training: 50, youth: 30, medical: 20 };
    const initialBalance = 1_000_000;
    const state = createMockState(CLUB_ID, levels, initialBalance);

    const expectedDailyCost = (50 + 30 + 20) * MAINTENANCE_COST_PER_LEVEL;

    // ACT
    const result = processDailyEconomy(state);

    // ASSERT
    expect(result.dailyExpenses).toBe(expectedDailyCost);
    expect(state.clubs.finances[CLUB_ID].balanceCurrent).toBe(
      initialBalance - expectedDailyCost
    );
  });

  it("should handle multiple clubs independently", () => {
    // ARRANGE
    const clubA = "club-a";
    const clubB = "club-b";

    const state = {
      clubInfras: {
        [clubA]: {
          trainingCenterLevel: 10,
          youthAcademyLevel: 0,
          medicalCenterLevel: 0,
        },
        [clubB]: {
          trainingCenterLevel: 100,
          youthAcademyLevel: 50,
          medicalCenterLevel: 50,
        },
      },
      clubFinances: {
        [clubA]: { balanceCurrent: 50_000 },
        [clubB]: { balanceCurrent: 1_000_000 },
      },
    } as unknown as GameState;

    // ACT
    const result = processDailyEconomy(state);

    // ASSERT
    expect(result.dailyExpenses).toBe(1000 + 20000);
    expect(state.clubs.finances[clubA].balanceCurrent).toBe(49_000);
    expect(state.clubs.finances[clubB].balanceCurrent).toBe(980_000);
  });

  it("should verify that debt doesn't break calculation (allowing negative balance)", () => {
    // ARRANGE
    const levels = { training: 10, youth: 10, medical: 10 };
    const state = createMockState(CLUB_ID, levels, 1000);

    // ACT
    processDailyEconomy(state);

    // ASSERT
    expect(state.clubs.finances[CLUB_ID].balanceCurrent).toBe(-2000);
  });
});
