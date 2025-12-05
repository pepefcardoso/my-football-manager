import { CompetitionScheduler, type MatchPair } from "./CompetitionScheduler";
import type { Competition } from "../domain/models";

interface ScheduledMatch {
  competitionId: number;
  seasonId: number;
  homeTeamId: number;
  awayTeamId: number;
  date: string;
  round: number;
  isPlayed: boolean;
}

export class CalendarService {
  /**
   * Gera o calendário completo para uma lista de competições
   */
  async scheduleSeason(
    competitions: Competition[],
    allTeams: number[]
  ): Promise<ScheduledMatch[]> {
    const sortedComps = competitions.sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    );

    const allMatchesToSave: ScheduledMatch[] = [];

    for (const comp of sortedComps) {
      const compTeams = allTeams.slice(0, comp.teams);

      let fixtures: MatchPair[] = [];

      if (comp.type === "league") {
        fixtures = CompetitionScheduler.generateLeagueFixtures(compTeams, true);
      } else {
        fixtures = CompetitionScheduler.generateKnockoutPairings(compTeams, 1);
      }

      const scheduledMatches = this.allocateDates(fixtures, comp);
      allMatchesToSave.push(...scheduledMatches);
    }

    return allMatchesToSave;
  }

  private allocateDates(
    fixtures: MatchPair[],
    comp: Competition
  ): ScheduledMatch[] {
    const scheduled: ScheduledMatch[] = [];

    const currentData = new Date("2025-01-15");

    if (comp.priority === 2) {
      currentData.setMonth(4);
      currentData.setDate(1);
    }

    const maxRounds = Math.max(...fixtures.map((f) => f.round));

    for (let r = 1; r <= maxRounds; r++) {
      const roundFixtures = fixtures.filter((f) => f.round === r);

      const matchDate = this.findNextSlot(currentData, comp.priority || 1);

      for (const fixture of roundFixtures) {
        scheduled.push({
          competitionId: comp.id,
          seasonId: 1,
          homeTeamId: fixture.homeTeamId,
          awayTeamId: fixture.awayTeamId,
          date: matchDate,
          round: r,
          isPlayed: false,
        });
      }

      const daysToJump = comp.priority === 3 ? 14 : comp.priority === 2 ? 7 : 4;

      currentData.setTime(new Date(matchDate).getTime());
      currentData.setDate(currentData.getDate() + daysToJump);
    }

    return scheduled;
  }

  private findNextSlot(startDate: Date, priority: number): string {
    const date = new Date(startDate);

    while (true) {
      const dayOfWeek = date.getDay();

      if (priority === 2) {
        if (dayOfWeek === 0 || dayOfWeek === 6) break;
      } else if (priority === 3) {
        if (dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4) break;
      } else {
        break;
      }

      date.setDate(date.getDate() + 1);
    }

    return date.toISOString().split("T")[0];
  }
}
