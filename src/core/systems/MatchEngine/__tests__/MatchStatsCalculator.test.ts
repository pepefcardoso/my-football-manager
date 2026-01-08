import { describe, it, expect } from "vitest";
import { MatchStatsCalculator } from "../MatchStatsCalculator";
import { MatchEvent } from "../../../models/match";

describe("MatchStatsCalculator", () => {
  const homeId = "club-home";
  const awayId = "club-away";

  const createEvent = (type: string, clubId: string): MatchEvent => ({
    id: "evt-1",
    matchId: "m-1",
    period: "1H",
    minute: 10,
    extraMinute: 0,
    type: type as any,
    clubId,
    playerId: "p-1",
    targetPlayerId: null,
    description: "Test event",
    createdAt: Date.now(),
  });

  it("should calculate score correctly", () => {
    // ARRANGE
    const events = [
      createEvent("GOAL", homeId),
      createEvent("GOAL", homeId),
      createEvent("GOAL", awayId),
    ];

    // ACT
    const result = MatchStatsCalculator.calculate(events, homeId, awayId);

    // ASSERT
    expect(result.score.home).toBe(2);
    expect(result.score.away).toBe(1);
  });

  it("should aggregate stats (cards and shots) correctly", () => {
    // ARRANGE
    const events = [
      createEvent("CARD_YELLOW", homeId),
      createEvent("CARD_RED", awayId),
      createEvent("CHANCE", homeId),
      createEvent("GOAL", homeId),
    ];

    // ACT
    const result = MatchStatsCalculator.calculate(events, homeId, awayId);

    // ASSERT
    expect(result.stats.homeCards).toBe(1);
    expect(result.stats.homeYellows).toBe(1);
    
    expect(result.stats.awayCards).toBe(1);
    expect(result.stats.awayReds).toBe(1);

    expect(result.stats.homeShots).toBe(2);
    expect(result.stats.awayShots).toBe(0);
  });

  it("should handle empty event lists gracefully", () => {
    const result = MatchStatsCalculator.calculate([], homeId, awayId);
    expect(result.score.home).toBe(0);
    expect(result.stats.homeShots).toBe(0);
  });
});