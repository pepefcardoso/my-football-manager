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
  groupName?: string;
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
  groupStructure?: Record<string, number[]>;
}

export class CalendarService {
  private continentalCompIds: Set<number> = new Set();
  private logger: Logger;

  constructor() {
    this.logger = new Logger("CalendarService");
  }

  async scheduleSeason(
    competitions: Competition[],
    allTeams: number[]
  ): Promise<ScheduledMatch[]> {
    this.logger.info("🗓️ Iniciando agendamento hierárquico da temporada...");

    this.continentalCompIds.clear();
    competitions.forEach((c) => {
      if (
        c.type === "group_knockout" ||
        (c as any).window === "continental" ||
        c.name.includes("Libertadores") ||
        c.name.includes("Sul-Americana")
      ) {
        this.continentalCompIds.add(c.id);
      }
    });

    const allMatchesToSave: ScheduledMatch[] = [];
    const occupiedDates = new Map<string, Set<number>>();

    try {
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

      this.logger.info(
        `✅ Agendamento concluído: ${allMatchesToSave.length} partidas geradas.`
      );
      return allMatchesToSave;
    } catch (error) {
      this.logger.error("Erro crítico ao agendar temporada:", error);
      throw error;
    }
  }

  private prepareCompetitionWindows(
    competitions: Competition[],
    allTeams: number[]
  ): CompetitionWindow[] {
    this.logger.debug(
      `Preparando janelas para ${competitions.length} competições.`
    );

    return competitions.map((comp) => {
      const compTeams = allTeams.slice(0, comp.teams);
      let fixtures: MatchPair[] = [];
      let groupStructure: Record<string, number[]> | undefined;

      if (comp.type === "group_knockout") {
        this.logger.info(`📊 Gerando fase de grupos para ${comp.name}`);

        const groupStage = CompetitionScheduler.generateGroupStageFixtures(
          compTeams,
          4,
          true
        );

        fixtures = groupStage.fixtures;
        groupStructure = groupStage.groups;

        this.logger.debug(
          `   └─ ${Object.keys(groupStage.groups).length} grupos criados com ${
            fixtures.length
          } partidas`
        );
      } else if (comp.type === "league") {
        fixtures = CompetitionScheduler.generateLeagueFixtures(compTeams, true);
      } else if (comp.type === "knockout") {
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
        groupStructure,
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

    this.logger.info(
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

            if (
              this.canScheduleMatches(round, dateStr, occupiedDates, allMatches)
            ) {
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

    this.logger.info(`✅ Estaduais agendados.`);
  }

  private scheduleNationalCompetitions(
    windows: CompetitionWindow[],
    occupiedDates: Map<string, Set<number>>,
    allMatches: ScheduledMatch[]
  ): void {
    const nationalComps = windows.filter((w) => w.window === "national");
    if (nationalComps.length === 0) return;

    this.logger.info(
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

            if (
              this.canScheduleMatches(round, dateStr, occupiedDates, allMatches)
            ) {
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

    this.logger.info(`✅ Nacionais agendados.`);
  }

  private scheduleContinentalCompetitions(
    windows: CompetitionWindow[],
    occupiedDates: Map<string, Set<number>>,
    allMatches: ScheduledMatch[]
  ): void {
    const continentalComps = windows.filter((w) => w.window === "continental");
    if (continentalComps.length === 0) return;

    this.logger.info(
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

            if (
              this.canScheduleMatches(round, dateStr, occupiedDates, allMatches)
            ) {
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

    this.logger.info(`✅ Continentais agendados.`);
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
   * Verifica conflito direto de data
   */
  private hasTeamConflict(
    teamId: number,
    date: string,
    existingMatches: ScheduledMatch[]
  ): boolean {
    return existingMatches.some(
      (m) =>
        m.date === date && (m.homeTeamId === teamId || m.awayTeamId === teamId)
    );
  }

  /**
   * Verifica se o time precisa de descanso (jogo continental nas últimas 48h)
   */
  private needsRest(
    teamId: number,
    currentDate: string,
    existingMatches: ScheduledMatch[]
  ): boolean {
    const targetDate = new Date(currentDate);
    const twoDaysAgo = new Date(targetDate);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const oneDayAgo = new Date(targetDate);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const datesToCheck = [
      twoDaysAgo.toISOString().split("T")[0],
      oneDayAgo.toISOString().split("T")[0],
    ];

    return existingMatches.some((m) => {
      const isContinental = this.continentalCompIds.has(m.competitionId);
      const isTeamInvolved = m.homeTeamId === teamId || m.awayTeamId === teamId;
      const isRecent = datesToCheck.includes(m.date);

      return isContinental && isTeamInvolved && isRecent;
    });
  }

  /**
   * Verifica se todos os times da rodada estão livres na data e respeitam o descanso
   */
  private canScheduleMatches(
    matches: MatchPair[],
    date: string,
    occupiedDates: Map<string, Set<number>>,
    allMatches: ScheduledMatch[]
  ): boolean {
    const occupiedTeams = occupiedDates.get(date) || new Set<number>();

    for (const match of matches) {
      if (
        occupiedTeams.has(match.homeTeamId) ||
        occupiedTeams.has(match.awayTeamId)
      ) {
        return false;
      }

      if (
        this.hasTeamConflict(match.homeTeamId, date, allMatches) ||
        this.hasTeamConflict(match.awayTeamId, date, allMatches)
      ) {
        return false;
      }

      if (
        this.needsRest(match.homeTeamId, date, allMatches) ||
        this.needsRest(match.awayTeamId, date, allMatches)
      ) {
        this.logger.warn(
          `⚠️ Conflito de descanso detectado em ${date}. Tentando próxima data.`
        );
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
      const scheduledMatch: ScheduledMatch = {
        competitionId,
        seasonId,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        date,
        round: match.round,
        isPlayed: false,
      };

      if (match.groupName) {
        scheduledMatch.groupName = match.groupName;
      }

      allMatches.push(scheduledMatch);

      occupiedTeams.add(match.homeTeamId);
      occupiedTeams.add(match.awayTeamId);
    }
  }
}
