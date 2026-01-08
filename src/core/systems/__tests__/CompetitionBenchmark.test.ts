import { describe, it, expect } from "vitest";
import {
  updateCompetitionStandings,
  getStandingIndexKey,
} from "../CompetitionSystem";
import { GameState } from "../../models/gameState";
import { Match } from "../../models/match";

const createSeasonScenario = () => {
  const state = {
    competitions: {
      standings: {},
      standingsLookup: {},
      clubCompetitionSeasons: {},
    },
  } as unknown as GameState;

  const groupId = "serie-a-2024";
  const numClubs = 20;

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

  const matches: Match[] = [];
  let matchIdCounter = 0;

  for (let round = 1; round <= 38; round++) {
    for (let i = 0; i < 10; i++) {
      matches.push({
        id: `m-${matchIdCounter++}`,
        competitionGroupId: groupId,
        homeClubId: `club-${i}`,
        awayClubId: `club-${i + 10}`,
        homeGoals: Math.floor(Math.random() * 5),
        awayGoals: Math.floor(Math.random() * 5),
        status: "FINISHED",
        roundNumber: round,
        stadiumId: "stadium-1",
        datetime: Date.now(),
      } as Match);
    }
  }

  return { state, matches };
};

describe("CompetitionSystem Benchmark (Season Simulation)", () => {
  it("should process a full 38-round season (380 matches) under 50ms", () => {
    // ARRANGE
    const { state, matches } = createSeasonScenario();

    // ACT
    const start = performance.now();
    updateCompetitionStandings(state, matches);
    const end = performance.now();

    const duration = end - start;

    console.log(`\n📊 BENCHMARK RESULT:`);
    console.log(`Matches Processed: ${matches.length}`);
    console.log(`Execution Time: ${duration.toFixed(4)}ms`);
    console.log(
      `Time per Match: ${(duration / matches.length).toFixed(4)}ms\n`
    );

    // ASSERT
    expect(duration).toBeLessThan(50);
    const firstStanding = Object.values(state.competitions.standings)[0];
    expect(firstStanding.gamesPlayed).toBeGreaterThan(0);
  });
});
