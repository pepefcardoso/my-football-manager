import { describe, it, expect } from "vitest";
import {
  updateCompetitionStandings,
  getStandingIndexKey,
} from "../CompetitionSystem";
import { GameState } from "../../models/gameState";
import { Match } from "../../models/match";

const createMockState = (numClubs: number): GameState => {
  const state = {
    competitions: {
      standings: {},
      standingsLookup: {},
      clubCompetitionSeasons: {},
    },
  } as unknown as GameState;

  const groupId = "group-1";

  for (let i = 0; i < numClubs; i++) {
    const clubId = `club-${i}`;
    const ccsId = `ccs-${i}`;
    const standingId = `std-${i}`;

    state.competitions.clubCompetitionSeasons[ccsId] = {
      id: ccsId,
      clubId,
      competitionSeasonId: "season-1",
    };

    state.competitions.standings[standingId] = {
      id: standingId,
      competitionGroupId: groupId,
      clubCompetitionSeasonId: ccsId,
      points: 0,
      gamesPlayed: 0,
      wins: 0,
      draws: 0,
      defeats: 0,
      goalsScored: 0,
      goalsConceded: 0,
      goalsBalance: 0,
    };

    state.competitions.standingsLookup[getStandingIndexKey(groupId, clubId)] =
      standingId;
  }

  return state;
};

describe("CompetitionSystem Optimization", () => {
  it("should update standings correctly using O(1) lookup", () => {
    // ARRANGE
    const state = createMockState(2);
    const match: Match = {
      id: "m1",
      competitionGroupId: "group-1",
      homeClubId: "club-0",
      awayClubId: "club-1",
      homeGoals: 2,
      awayGoals: 1,
      status: "FINISHED",
    } as Match;

    // ACT
    updateCompetitionStandings(state, [match]);

    // ASSERT
    const homeStanding = state.competitions.standings["std-0"];
    const awayStanding = state.competitions.standings["std-1"];

    expect(homeStanding.points).toBe(3);
    expect(awayStanding.points).toBe(0);
    expect(homeStanding.gamesPlayed).toBe(1);
  });

  it("should handle missing index by rebuilding it", () => {
    // ARRANGE
    const state = createMockState(2);

    (state.competitions as any).standingsLookup = undefined;

    const match: Match = {
      id: "m1",
      competitionGroupId: "group-1",
      homeClubId: "club-0",
      awayClubId: "club-1",
      homeGoals: 1,
      awayGoals: 1,
      status: "FINISHED",
    } as Match;

    // ACT
    updateCompetitionStandings(state, [match]);

    // ASSERT
    expect(state.competitions.standingsLookup).toBeDefined();
    expect(Object.keys(state.competitions.standingsLookup).length).toBe(2);
    expect(state.competitions.standings["std-0"].points).toBe(1);
  });

  it("performance: processing 1000 matches should be instant", () => {
    const state = createMockState(100);
    const matches: Match[] = [];

    for (let i = 0; i < 1000; i++) {
      matches.push({
        id: `m-${i}`,
        competitionGroupId: "group-1",
        homeClubId: `club-${i % 100}`,
        awayClubId: `club-${(i + 1) % 100}`,
        homeGoals: 1,
        awayGoals: 0,
        status: "FINISHED",
      } as Match);
    }

    const start = performance.now();
    updateCompetitionStandings(state, matches);
    const end = performance.now();

    console.log(`Time to process 1000 matches: ${(end - start).toFixed(2)}ms`);
    expect(end - start).toBeLessThan(50);
  });
});
