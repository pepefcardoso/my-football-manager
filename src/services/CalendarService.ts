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
   * Gera o calendário intercalado (Ligas nos FDS, Copas no Meio da Semana)
   */
  async scheduleSeason(
    competitions: Competition[],
    allTeams: number[]
  ): Promise<ScheduledMatch[]> {
    const allMatchesToSave: ScheduledMatch[] = [];

    const compFixtures: Record<
      number,
      { fixtures: MatchPair[]; priority: number; type: string }
    > = {};

    for (const comp of competitions) {
      const compTeams = allTeams.slice(0, comp.teams);
      let fixtures: MatchPair[] = [];

      if (comp.type === "league") {
        fixtures = CompetitionScheduler.generateLeagueFixtures(compTeams, true);
      } else {
        fixtures = CompetitionScheduler.generateKnockoutPairings(compTeams, 1);
      }

      compFixtures[comp.id] = {
        fixtures,
        priority: comp.priority || 1,
        type: comp.type,
      };
    }

    const startDate = new Date("2025-01-20");
    const endDate = new Date("2025-12-01");
    const currentDate = new Date(startDate);

    const currentRoundMap: Record<number, number> = {};
    competitions.forEach((c) => (currentRoundMap[c.id] = 1));

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const dateStr = currentDate.toISOString().split("T")[0];
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isMidweek = dayOfWeek === 3;

      const activeCompetitions = competitions.sort(
        (a, b) => (b.priority || 0) - (a.priority || 0)
      );

      for (const comp of activeCompetitions) {
        const info = compFixtures[comp.id];
        const roundToSchedule = currentRoundMap[comp.id];

        const roundMatches = info.fixtures.filter(
          (f) => f.round === roundToSchedule
        );
        if (roundMatches.length === 0) continue;

        let shouldSchedule = false;

        if (info.type === "league" && isWeekend) {
          if (dayOfWeek === 6) shouldSchedule = true;
        } else if (info.type !== "league" && isMidweek) {
          shouldSchedule = true;
        }

        if (shouldSchedule) {
          for (const fixture of roundMatches) {
            allMatchesToSave.push({
              competitionId: comp.id,
              seasonId: 1,
              homeTeamId: fixture.homeTeamId,
              awayTeamId: fixture.awayTeamId,
              date: dateStr,
              round: roundToSchedule,
              isPlayed: false,
            });
          }

          currentRoundMap[comp.id]++;
          break;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return allMatchesToSave;
  }
}
