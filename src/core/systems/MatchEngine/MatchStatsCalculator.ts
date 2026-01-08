import { MatchEvent } from "../../models/match";
import { ID } from "../../models/types";

export interface LiveMatchStats {
  score: {
    home: number;
    away: number;
  };
  stats: {
    homeCards: number;
    awayCards: number;
    homeShots: number;
    awayShots: number;
    homeYellows: number;
    awayYellows: number;
    homeReds: number;
    awayReds: number;
  };
}

export class MatchStatsCalculator {
  static calculate(
    events: MatchEvent[],
    homeClubId: ID,
    awayClubId: ID
  ): LiveMatchStats {
    const result: LiveMatchStats = {
      score: { home: 0, away: 0 },
      stats: {
        homeCards: 0,
        awayCards: 0,
        homeShots: 0,
        awayShots: 0,
        homeYellows: 0,
        awayYellows: 0,
        homeReds: 0,
        awayReds: 0,
      },
    };

    for (const event of events) {
      const isHome = event.clubId === homeClubId;
      const isAway = event.clubId === awayClubId;

      if (event.type === "GOAL") {
        if (isHome) result.score.home++;
        if (isAway) result.score.away++;
        if (isHome) result.stats.homeShots++;
        if (isAway) result.stats.awayShots++;
      }

      if (event.type === "CARD_YELLOW" || event.type === "CARD_RED") {
        if (isHome) result.stats.homeCards++;
        if (isAway) result.stats.awayCards++;

        if (event.type === "CARD_YELLOW") {
          if (isHome) result.stats.homeYellows++;
          if (isAway) result.stats.awayYellows++;
        } else {
          if (isHome) result.stats.homeReds++;
          if (isAway) result.stats.awayReds++;
        }
      }

      if (event.type === "CHANCE" || (event.type as string) === "SHOT") {
        if (isHome) result.stats.homeShots++;
        if (isAway) result.stats.awayShots++;
      }
    }

    return result;
  }
}
