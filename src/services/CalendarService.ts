import { CompetitionScheduler, type MatchPair } from "./CompetitionScheduler";
import type { Competition } from "../domain/models";
import { Logger } from "../lib/Logger";

interface ScheduledMatch {
  competitionId: number;
  seasonId: number;
  homeTeamId: number;
  awayTeamId: number;
  date: string;
  round: number;
  isPlayed: boolean;
}

interface CompetitionWindow {
  id: number;
  name: string;
  window: "state" | "national" | "continental";
  startMonth: number;
  endMonth: number;
  type: string;
  priority: number;
  teams: number;
  fixtures: MatchPair[];
}

const logger = new Logger("CalendarService");

export class CalendarService {
  async scheduleSeason(
    competitions: Competition[],
    allTeams: number[]
  ): Promise<ScheduledMatch[]> {
    logger.info("🗓️ Iniciando agendamento hierárquico da temporada...");

    const allMatchesToSave: ScheduledMatch[] = [];
    const occupiedDates = new Map<string, Set<number>>();

    const competitionWindows = this.prepareCompetitionWindows(
      competitions,
      allTeams
    );

    this.scheduleStateCompetitions(
      competitionWindows,
      occupiedDates,
      allMatchesToSave
    );

    this.scheduleNationalCompetitions(
      competitionWindows,
      occupiedDates,
      allMatchesToSave
    );

    this.scheduleContinentalCompetitions(
      competitionWindows,
      occupiedDates,
      allMatchesToSave
    );

    logger.info(
      `✅ Agendamento concluído: ${allMatchesToSave.length} partidas`
    );
    return allMatchesToSave;
  }

  private prepareCompetitionWindows(
    competitions: Competition[],
    allTeams: number[]
  ): CompetitionWindow[] {
    return competitions.map((comp) => {
      const compTeams = allTeams.slice(0, comp.teams);
      let fixtures: MatchPair[] = [];

      if (comp.type === "league") {
        fixtures = CompetitionScheduler.generateLeagueFixtures(compTeams, true);
      } else {
        fixtures = CompetitionScheduler.generateKnockoutPairings(compTeams, 1);
      }

      return {
        id: comp.id,
        name: comp.name,
        window: (comp as any).window || "national",
        startMonth: (comp as any).startMonth || 1,
        endMonth: (comp as any).endMonth || 12,
        type: comp.type,
        priority: comp.priority || 1,
        teams: comp.teams,
        fixtures,
      };
    });
  }

  private scheduleStateCompetitions(
    windows: CompetitionWindow[],
    occupiedDates: Map<string, Set<number>>,
    allMatches: ScheduledMatch[]
  ): void {
    const stateComps = windows.filter((w) => w.window === "state");
    if (stateComps.length === 0) return;

    logger.info(
      `📅 Agendando ${stateComps.length} competição(ões) estadual(is)...`
    );

    const startDate = new Date("2025-01-20");
    const endDate = new Date("2025-04-30");

    for (const comp of stateComps) {
      const currentDate = new Date(startDate);
      const roundsToSchedule = this.getRounds(comp.fixtures);

      for (const round of roundsToSchedule) {
        while (currentDate <= endDate) {
          const dayOfWeek = currentDate.getDay();

          if (dayOfWeek === 6 || dayOfWeek === 0) {
            const dateStr = currentDate.toISOString().split("T")[0];

            if (this.canScheduleMatches(round, dateStr, occupiedDates)) {
              this.addMatches(
                comp.id,
                1,
                round,
                dateStr,
                occupiedDates,
                allMatches
              );
              break;
            }
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }

        currentDate.setDate(currentDate.getDate() + 7);
      }
    }

    logger.info(`✅ Estaduais agendados: ${stateComps.length} competições`);
  }

  private scheduleNationalCompetitions(
    windows: CompetitionWindow[],
    occupiedDates: Map<string, Set<number>>,
    allMatches: ScheduledMatch[]
  ): void {
    const nationalComps = windows.filter((w) => w.window === "national");
    if (nationalComps.length === 0) return;

    logger.info(
      `📅 Agendando ${nationalComps.length} competição(ões) nacional(is)...`
    );

    const startDate = new Date("2025-05-03");
    const endDate = new Date("2025-12-15");

    for (const comp of nationalComps) {
      const currentDate = new Date(startDate);
      const roundsToSchedule = this.getRounds(comp.fixtures);

      for (const round of roundsToSchedule) {
        while (currentDate <= endDate) {
          const dayOfWeek = currentDate.getDay();

          if (dayOfWeek === 6 || dayOfWeek === 0) {
            const dateStr = currentDate.toISOString().split("T")[0];

            if (this.canScheduleMatches(round, dateStr, occupiedDates)) {
              this.addMatches(
                comp.id,
                1,
                round,
                dateStr,
                occupiedDates,
                allMatches
              );
              break;
            }
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }

        currentDate.setDate(currentDate.getDate() + 7);
      }
    }

    logger.info(`✅ Nacionais agendados: ${nationalComps.length} competições`);
  }

  private scheduleContinentalCompetitions(
    windows: CompetitionWindow[],
    occupiedDates: Map<string, Set<number>>,
    allMatches: ScheduledMatch[]
  ): void {
    const continentalComps = windows.filter((w) => w.window === "continental");
    if (continentalComps.length === 0) return;

    logger.info(
      `📅 Agendando ${continentalComps.length} competição(ões) continental(is)...`
    );

    const startDate = new Date("2025-05-07");
    const endDate = new Date("2025-11-30");

    for (const comp of continentalComps) {
      const currentDate = new Date(startDate);
      const roundsToSchedule = this.getRounds(comp.fixtures);

      for (const round of roundsToSchedule) {
        while (currentDate <= endDate) {
          const dayOfWeek = currentDate.getDay();

          if (dayOfWeek === 3) {
            const dateStr = currentDate.toISOString().split("T")[0];

            if (this.canScheduleMatches(round, dateStr, occupiedDates)) {
              this.addMatches(
                comp.id,
                1,
                round,
                dateStr,
                occupiedDates,
                allMatches
              );
              break;
            }
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }

        currentDate.setDate(currentDate.getDate() + 14);
      }
    }

    logger.info(
      `✅ Continentais agendados: ${continentalComps.length} competições`
    );
  }

  /**
   * Agrupa fixtures por rodada
   */
  private getRounds(fixtures: MatchPair[]): MatchPair[][] {
    const roundMap = new Map<number, MatchPair[]>();

    for (const fixture of fixtures) {
      if (!roundMap.has(fixture.round)) {
        roundMap.set(fixture.round, []);
      }
      roundMap.get(fixture.round)!.push(fixture);
    }

    return Array.from(roundMap.values());
  }

  /**
   * Verifica se todos os times da rodada estão livres na data
   */
  private canScheduleMatches(
    matches: MatchPair[],
    date: string,
    occupiedDates: Map<string, Set<number>>
  ): boolean {
    const occupiedTeams = occupiedDates.get(date) || new Set<number>();

    for (const match of matches) {
      if (
        occupiedTeams.has(match.homeTeamId) ||
        occupiedTeams.has(match.awayTeamId)
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Adiciona partidas ao calendário e marca times como ocupados
   */
  private addMatches(
    competitionId: number,
    seasonId: number,
    matches: MatchPair[],
    date: string,
    occupiedDates: Map<string, Set<number>>,
    allMatches: ScheduledMatch[]
  ): void {
    if (!occupiedDates.has(date)) {
      occupiedDates.set(date, new Set<number>());
    }

    const occupiedTeams = occupiedDates.get(date)!;

    for (const match of matches) {
      allMatches.push({
        competitionId,
        seasonId,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        date,
        round: match.round,
        isPlayed: false,
      });

      occupiedTeams.add(match.homeTeamId);
      occupiedTeams.add(match.awayTeamId);
    }
  }
}
