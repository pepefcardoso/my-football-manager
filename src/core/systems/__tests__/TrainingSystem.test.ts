import { describe, it, expect, vi, beforeEach } from "vitest";
import { processDailyTraining } from "../TrainingSystem";
import { GameState } from "../../models/gameState";
import { Player } from "../../models/people";
import { rng } from "../../utils/generators";

vi.mock("../../utils/generators", () => ({
  rng: {
    range: vi.fn(),
    pick: vi.fn(),
    normal: vi.fn(),
  },
}));

describe("TrainingSystem", () => {
  let mockState: GameState;
  const CLUB_ID = "club-1";
  const PLAYER_ID = "player-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mockState = {
      meta: {
        currentDate: new Date("2024-01-01").getTime(),
        userClubId: CLUB_ID,
        activeSeasonId: "season-1",
      },
      market: {
        contracts: {
          c1: { id: "c1", playerId: PLAYER_ID, clubId: CLUB_ID, active: true },
        },
      },
      people: {
        players: {
          [PLAYER_ID]: createMockPlayer(PLAYER_ID, 20),
        },
      },
      clubs: {
        infras: {
          [CLUB_ID]: { trainingCenterLevel: 50 },
        },
      },
      system: {
        stats: {
          playerSeason: {},
        },
      },
    } as unknown as GameState;

    (rng.range as any).mockReturnValue(0);
    (rng.pick as any).mockImplementation((arr: any[]) =>
      arr.includes("finishing") ? "finishing" : arr[0]
    );
  });

  it("should boost growth for young players (<21)", () => {
    // ARRANGE
    const youngPlayer = mockState.people.players[PLAYER_ID];
    youngPlayer.birthDate = getBirthDateFromAge(18);
    const initialFinishing = youngPlayer.finishing;

    // ACT
    processDailyTraining(mockState);

    // ASSERT
    expect(youngPlayer.finishing).toBeGreaterThan(initialFinishing);
    const diff = youngPlayer.finishing - initialFinishing;
    expect(diff).toBeCloseTo(0.11, 2);
  });

  it("should trigger regression for veteran players (>30)", () => {
    // ARRANGE
    const veteranId = "vet-1";
    mockState.people.players[veteranId] = createMockPlayer(veteranId, 34);
    mockState.market.contracts["c2"] = {
      id: "c2",
      playerId: veteranId,
      clubId: CLUB_ID,
      active: true,
    } as any;

    (rng.range as any).mockReturnValue(0);
    (rng.pick as any).mockReturnValue("speed");

    const veteran = mockState.people.players[veteranId];
    veteran.speed = 80;

    // ACT
    processDailyTraining(mockState);

    // ASSERT
    expect(veteran.speed).toBeLessThan(80);
    expect(veteran.speed).toBeCloseTo(79.97, 2);
  });

  it("should not improve player if potential is reached", () => {
    // ARRANGE
    const player = mockState.people.players[PLAYER_ID];
    player.potential = 70;
    player.finishing = 70;
    player.passing = 70;
    player.speed = 70;
    player.defending = 70;
    player.technique = 70;

    // ACT
    const result = processDailyTraining(mockState);

    // ASSERT
    expect(result.improvedAttributes).toBe(0);
  });

  it("should apply infrastructure bonus correctly", () => {
    // ARRANGE
    const player = mockState.people.players[PLAYER_ID];
    const initialAttr = player.finishing;
    mockState.clubs.infras[CLUB_ID].trainingCenterLevel = 90;

    // ACT
    processDailyTraining(mockState);

    // ASSERT
    const growth = player.finishing - initialAttr;
    expect(growth).toBeCloseTo(0.125, 3);
  });

  it("should cap attributes at 99", () => {
    // ARRANGE
    const player = mockState.people.players[PLAYER_ID];
    player.finishing = 99;

    // ACT
    processDailyTraining(mockState);

    // ASSERT
    expect(player.finishing).toBe(99);
  });
});

// Helpers
function createMockPlayer(id: string, age: number): Player {
  return {
    id,
    name: "Test Player",
    birthDate: getBirthDateFromAge(age),
    finishing: 50,
    passing: 50,
    speed: 50,
    defending: 50,
    technique: 50,
    potential: 80,
    primaryPositionId: "ATT",
  } as Player;
}

function getBirthDateFromAge(age: number): number {
  return new Date("2024-01-01").getTime() - age * 365 * 24 * 60 * 60 * 1000;
}
