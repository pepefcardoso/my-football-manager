import { describe, it, expect, vi, beforeEach } from "vitest";
import { processDailyRecovery } from "../RecoverySystem";
import { GameState } from "../../models/gameState";
import * as NotificationSystem from "../NotificationSystem";

vi.mock("../NotificationSystem", () => ({
  generateNotification: vi.fn(),
}));

describe("RecoverySystem", () => {
  let mockState: GameState;
  const CLUB_ID = "club-1";
  const PLAYER_ID = "p1";

  beforeEach(() => {
    vi.clearAllMocks();

    mockState = {
      meta: {
        currentDate: new Date("2024-01-01").getTime(),
        userClubId: CLUB_ID,
      },
      contracts: {
        c1: { playerId: PLAYER_ID, clubId: CLUB_ID, active: true },
      },
      players: {
        [PLAYER_ID]: {
          id: PLAYER_ID,
          birthDate: new Date("2000-01-01").getTime(),
        },
      },
      playerStates: {
        [PLAYER_ID]: {
          playerId: PLAYER_ID,
          fitness: 50,
          morale: 80,
          matchReadiness: 100,
        },
      },
      staffContracts: {},
      staff: {},
      clubInfras: {
        [CLUB_ID]: { medicalCenterLevel: 20 },
      },
      playerInjuries: {},
      notifications: {},
    } as unknown as GameState;
  });

  it("should apply base recovery rate correctly", () => {
    // ARRANGE

    // ACT
    processDailyRecovery(mockState);

    // ASSERT
    const pState = mockState.people.playerStates[PLAYER_ID];
    expect(pState.fitness).toBe(60.5);
  });

  it("should boost recovery with high level medical staff", () => {
    // ARRANGE
    mockState.market.staffContracts["s1"] = {
      staffId: "staff1",
      clubId: CLUB_ID,
      active: true,
    } as any;
    mockState.people.staff["staff1"] = { id: "staff1", overall: 90 } as any;

    // ACT
    processDailyRecovery(mockState);

    // ASSERT
    const pState = mockState.people.playerStates[PLAYER_ID];
    expect(pState.fitness).toBe(62);
  });

  it("should penalize recovery for older players (>32)", () => {
    // ARRANGE
    mockState.people.players[PLAYER_ID].birthDate = new Date("1990-01-01").getTime();

    // ACT
    processDailyRecovery(mockState);

    // ASSERT
    const pState = mockState.people.playerStates[PLAYER_ID];
    expect(pState.fitness).toBe(59);
  });

  it("should process injury return and set relapse risk", () => {
    // ARRANGE
    const injuryId = "inj1";
    const returnDate = mockState.meta.currentDate;

    mockState.people.playerInjuries[injuryId] = {
      id: injuryId,
      playerId: PLAYER_ID,
      name: "Player 1",
      estimatedReturnDate: returnDate,
      severity: "High",
      startDate: 0,
    };

    // ACT
    const result = processDailyRecovery(mockState);

    // ASSERT
    expect(mockState.people.playerInjuries[injuryId]).toBeUndefined();
    expect(result.recoveredPlayers).toContain(PLAYER_ID);

    const pState = mockState.people.playerStates[PLAYER_ID];
    expect(pState.fitness).toBe(90);
    expect(pState.matchReadiness).toBe(70);

    expect(NotificationSystem.generateNotification).toHaveBeenCalledWith(
      expect.anything(),
      "IMPORTANT",
      "Retorno de Lesão",
      expect.stringContaining("recuperou-se"),
      expect.objectContaining({ id: PLAYER_ID })
    );
  });

  it("should cap fitness at 100", () => {
    // ARRANGE
    mockState.people.playerStates[PLAYER_ID].fitness = 95;

    // ACT
    processDailyRecovery(mockState);

    // ASSERT
    expect(mockState.people.playerStates[PLAYER_ID].fitness).toBe(100);
  });
});
