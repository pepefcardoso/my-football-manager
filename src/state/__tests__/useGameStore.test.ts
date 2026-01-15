import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGameStore } from "../useGameStore";
import { Match } from "../../core/models/match";
import * as MatchSystem from "../../core/systems/MatchSystem";

vi.mock("../../data/fileSystem", () => ({
  saveGameToDisk: vi.fn().mockResolvedValue({ success: true, metadata: {} }),
  loadGameFromDisk: vi.fn().mockResolvedValue(null),
  listSaveFiles: vi.fn().mockResolvedValue([]),
  deleteSaveFile: vi.fn().mockResolvedValue({ success: true }),
  getSaveInfo: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../core/systems/MatchSystem");

vi.mock("../../core/systems/TacticsSystem", () => ({
  TacticsSystem: {
    suggestOptimalLineup: vi.fn(() => ({
      starters: Array(11).fill("player-id"),
      bench: [],
      reserves: [],
    })),
  },
}));

const setupTestState = () => {
  useGameStore.getState().resetGame();

  useGameStore.getState().setState((state) => {
    state.meta.userClubId = "club-user";

    state.clubs.clubs["club-user"] = {
      id: "club-user",
      name: "User FC",
      badgeId: "generic",
      primaryColor: "#000",
      secondaryColor: "#FFF",
    } as any;

    state.clubs.clubs["club-cpu"] = {
      id: "club-cpu",
      name: "CPU FC",
      badgeId: "generic",
      primaryColor: "#F00",
      secondaryColor: "#FFF",
    } as any;

    const matchId = "match-1";
    state.matches.matches[matchId] = {
      id: matchId,
      homeClubId: "club-user",
      awayClubId: "club-cpu",
      homeGoals: 0,
      awayGoals: 0,
      status: "SCHEDULED",
      datetime: Date.now() + 100000,
      competitionGroupId: "comp-1",
      stadiumId: "stadium-1",
    } as Match;

    state.market.clubSquadIndex["club-user"] = [];
    for (let i = 0; i < 15; i++) {
      const pid = `p-${i}`;
      state.people.players[pid] = {
        id: pid,
        name: `Player ${i}`,
        primaryPositionId: "MID",
      } as any;
      state.market.contracts[`c-${i}`] = {
        id: `c-${i}`,
        playerId: pid,
        clubId: "club-user",
        active: true,
      } as any;
      state.market.playerContractIndex[pid] = `c-${i}`;
      state.market.clubSquadIndex["club-user"].push(pid);
    }
  });
};

describe("Store Integration: Match Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTestState();

    vi.mocked(MatchSystem.buildTeamContext).mockReturnValue({
      clubId: "mock-club",
      clubName: "Mock FC",
      tactics: {} as any,
      startingXI: [],
      bench: [],
    });

    vi.mocked(MatchSystem.simulateSingleMatch).mockResolvedValue({
      matchId: "match-1",
      homeScore: 2,
      awayScore: 1,
      stats: {
        homePossession: 55,
        awayPossession: 45,
        homeShots: 10,
        awayShots: 5,
        homeShotsOnTarget: 5,
        awayShotsOnTarget: 2,
        homeFouls: 10,
        awayFouls: 10,
        homeCorners: 5,
        awayCorners: 2,
      },
      events: [],
      playerStats: [],
    } as any);
  });

  it("should successfully prepare, lineup, and play a match", async () => {
    const store = useGameStore.getState();
    const matchId = "match-1";

    // ARRANGE
    const starters = Array.from({ length: 11 }, (_, i) => `p-${i}`);
    const bench = [`p-11`, `p-12`];

    // ACT 1
    store.setTempLineup({
      starters,
      bench,
      reserves: [],
    });

    expect(useGameStore.getState().matches.tempLineup?.starters).toHaveLength(
      11
    );

    // ACT 2
    await store.playMatch(matchId);

    // ASSERT
    const updatedState = useGameStore.getState();
    const playedMatch = updatedState.matches.matches[matchId];

    expect(playedMatch.status).toBe("FINISHED");
    expect(playedMatch.homeGoals).toBe(2);
    expect(playedMatch.awayGoals).toBe(1);
    expect(updatedState.matches.tempLineup).toBeNull();
  });

  it("should block playing a match if lineup is incomplete (< 11 starters)", async () => {
    const store = useGameStore.getState();
    const matchId = "match-1";

    const starters = Array.from({ length: 10 }, (_, i) => `p-${i}`);

    store.setTempLineup({
      starters,
      bench: [],
      reserves: [],
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await store.playMatch(matchId);

    const updatedState = useGameStore.getState();
    const match = updatedState.matches.matches[matchId];

    expect(match.status).toBe("SCHEDULED");
    expect(updatedState.matches.tempLineup).not.toBeNull();

    consoleSpy.mockRestore();
  });

  it("should auto-pick a lineup via TacticsSystem integration", () => {
    const store = useGameStore.getState();
    store.autoPickLineup();

    const lineup = useGameStore.getState().matches.tempLineup;
    expect(lineup).toBeDefined();
    expect(lineup?.starters).toHaveLength(11);
  });

  it("should allow moving players between starter and bench", () => {
    const store = useGameStore.getState();
    const pStarter = "p-0";
    const pBench = "p-11";

    store.setTempLineup({
      starters: [pStarter],
      bench: [pBench],
      reserves: [],
    });

    store.movePlayerInLineup(pStarter, "bench");
    let lineup = useGameStore.getState().matches.tempLineup!;
    expect(lineup.starters).not.toContain(pStarter);
    expect(lineup.bench).toContain(pStarter);

    store.movePlayerInLineup(pBench, "starters");
    lineup = useGameStore.getState().matches.tempLineup!;
    expect(lineup.starters).toContain(pBench);
    expect(lineup.bench).not.toContain(pBench);
  });
});
