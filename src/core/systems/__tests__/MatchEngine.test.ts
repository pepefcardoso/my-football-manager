import { describe, it, expect } from "vitest";
import { matchEngine } from "../MatchEngine";
import { TeamMatchContext } from "../MatchEngine/types";
import { Player } from "../../models/people";
import { TeamTactics } from "../../models/tactics";
import { Match } from "../../models/match";

const createTestPlayer = (
  id: string,
  pos: string,
  skillLevel: number
): Player => {
  return {
    id,
    name: `Player ${id}`,
    primaryPositionId: pos,
    finishing: skillLevel,
    technique: skillLevel,
    passing: skillLevel,
    crossing: skillLevel,
    defending: skillLevel,
    speed: skillLevel,
    stamina: 100,
    strength: skillLevel,
    force: skillLevel,
    intelligence: skillLevel,
    determination: skillLevel,
    gkReflexes: pos === "GK" ? skillLevel : 10,
    gkRushingOut: pos === "GK" ? skillLevel : 10,
    gkDistribution: pos === "GK" ? skillLevel : 10,
  } as unknown as Player;
};

const createTeamContext = (
  clubId: string,
  skillLevel: number
): TeamMatchContext => {
  const startingXI: Player[] = [];

  startingXI.push(createTestPlayer(`${clubId}-GK`, "GK", skillLevel));
  for (let i = 0; i < 4; i++)
    startingXI.push(createTestPlayer(`${clubId}-DEF-${i}`, "DEF", skillLevel));
  for (let i = 0; i < 3; i++)
    startingXI.push(createTestPlayer(`${clubId}-MID-${i}`, "MID", skillLevel));
  for (let i = 0; i < 3; i++)
    startingXI.push(createTestPlayer(`${clubId}-ATT-${i}`, "ATT", skillLevel));

  return {
    clubId,
    clubName: `Club ${clubId} (Skill ${skillLevel})`,
    tactics: { mentality: "BALANCED" } as TeamTactics,
    startingXI,
    bench: [],
  };
};

const createMatch = (): Match =>
  ({
    id: "test-match",
    homeClubId: "home",
    awayClubId: "away",
    status: "SCHEDULED",
    datetime: Date.now(),
  } as Match);

describe("MatchEngine Core Logic", () => {
  it("should generate realistic goal averages (between 1.5 and 4.5 per game)", () => {
    // ARRANGE
    const home = createTeamContext("home", 70);
    const away = createTeamContext("away", 70);
    const match = createMatch();

    const SIMULATIONS = 50;
    let totalGoals = 0;

    // ACT
    for (let i = 0; i < SIMULATIONS; i++) {
      const result = matchEngine.simulate(match, home, away);
      totalGoals += result.homeScore + result.awayScore;
    }

    const averageGoals = totalGoals / SIMULATIONS;
    console.log(
      `[Test Log] Média de golos (Equilibrado): ${averageGoals.toFixed(2)}`
    );

    // ASSERT
    expect(averageGoals).toBeGreaterThan(1.5);
    expect(averageGoals).toBeLessThan(4.5);
  });

  it("strong team should beat weak team most of the time (>70%)", () => {
    // ARRANGE
    const strongTeam = createTeamContext("strong", 95);
    const weakTeam = createTeamContext("weak", 45);
    const match = createMatch();

    const SIMULATIONS = 100;
    let strongWins = 0;
    let draws = 0;
    let weakWins = 0;

    // ACT
    for (let i = 0; i < SIMULATIONS; i++) {
      const result = matchEngine.simulate(match, strongTeam, weakTeam);

      if (result.homeScore > result.awayScore) {
        strongWins++;
      } else if (result.homeScore === result.awayScore) {
        draws++;
      } else {
        weakWins++;
      }
    }

    console.log(
      `[Test Log] Strong vs Weak: W${strongWins}-D${draws}-L${weakWins}`
    );

    // ASSERT
    expect(strongWins).toBeGreaterThanOrEqual(70);
    expect(weakWins).toBeLessThan(15);
  });

  it("should generate match events (goals, stats)", () => {
    const home = createTeamContext("home", 80);
    const away = createTeamContext("away", 80);
    const match = createMatch();

    const result = matchEngine.simulate(match, home, away);

    expect(result.matchId).toBe(match.id);
    expect(result.events).toBeDefined();
    expect(Array.isArray(result.events)).toBe(true);

    const totalScore = result.homeScore + result.awayScore;
    const goalEvents = result.events.filter((e) => e.type === "GOAL");
    expect(goalEvents.length).toBe(totalScore);

    expect(result.playerStats.length).toBe(22);
  });
});
