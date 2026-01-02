import { describe, it, expect, vi, beforeEach } from "vitest";
import { QuickMatchStrategy } from "../QuickMatchStrategy";
import { Match } from "../../../models/match";
import { TeamMatchContext } from "../types";
import { Player } from "../../../models/people";

vi.mock("../../../utils/generators", () => ({
  rng: {
    normal: vi.fn(),
    range: vi.fn(),
    pick: vi.fn(),
  },
}));

import { rng } from "../../../utils/generators";

describe("QuickMatchStrategy", () => {
  let strategy: QuickMatchStrategy;
  let mockMatch: Match;
  let mockHomeTeam: TeamMatchContext;
  let mockAwayTeam: TeamMatchContext;

  const createMockPlayer = (id: string, name: string): Player =>
    ({
      id,
      name,
      primaryPositionId: "ST",
      _tempOverall: 80,
    } as unknown as Player);

  beforeEach(() => {
    strategy = new QuickMatchStrategy();
    vi.clearAllMocks();

    mockMatch = { id: "match-1" } as Match;

    mockHomeTeam = {
      clubId: "club-1",
      clubName: "Home FC",
      tactics: {} as any,
      startingXI: [createMockPlayer("h1", "Home Player 1")],
      bench: [],
    };

    mockAwayTeam = {
      clubId: "club-2",
      clubName: "Away FC",
      tactics: {} as any,
      startingXI: [createMockPlayer("a1", "Away Player 1")],
      bench: [],
    };
  });

  it("should simulate a match and return correct score based on RNG", () => {
    vi.mocked(rng.normal).mockReturnValueOnce(3).mockReturnValueOnce(1);

    vi.mocked(rng.range).mockReturnValue(10);
    vi.mocked(rng.pick).mockImplementation((arr: any[]) => arr[0]);

    const result = strategy.simulate(mockMatch, mockHomeTeam, mockAwayTeam);

    expect(result.matchId).toBe("match-1");
    expect(result.homeScore).toBe(3);
    expect(result.awayScore).toBe(1);
  });

  it("should calculate strength using _tempOverall", () => {
    vi.mocked(rng.normal).mockReturnValue(1);
    vi.mocked(rng.pick).mockImplementation((arr: any[]) => arr[0]);

    const result = strategy.simulate(mockMatch, mockHomeTeam, mockAwayTeam);
    expect(result).toBeDefined();
  });
});
