import { BaseService } from "./BaseService";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import type { ServiceResult } from "../domain/ServiceResults";
import type { Competition } from "../domain/models";
import { getBalanceValue } from "../engine/GameBalanceConfig";
import { CompetitionScheduler, type MatchPair } from "../domain/logic/CompetitionScheduler";

export interface ScheduledMatch {
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

interface SchedulableCompetition extends Competition {
  window?: "state" | "national" | "continental";
  startMonth?: number;
  endMonth?: number;
}

export interface ScheduleSeasonInput {
  competitions: Competition[];
  allTeams: number[];
}

const CALENDAR_CONFIG = getBalanceValue("SEASON").CALENDAR;

export class CalendarService extends BaseService {
  private continentalCompIds: Set<number> = new Set();

  constructor(repositories: IRepositoryContainer) {
    super(repositories, "CalendarService");
  }

  /**
   *
   * @param competitions
   * @param allTeams
   * @returns
   */
  async scheduleSeason(
    competitions: Competition[],
    allTeams: number[]
  ): Promise<ServiceResult<ScheduledMatch[]>> {
    return this.execute(
      "scheduleSeason",
      { competitions, allTeams },
      async ({ competitions, allTeams }) => {
        this.continentalCompIds.clear();

        (competitions as SchedulableCompetition[]).forEach((c) => {
          if (
            c.type === "group_knockout" ||
            c.window === "continental" ||
            c.name.includes("Libertadores") ||
            c.name.includes("Sul-Americana")
          ) {
            this.continentalCompIds.add(c.id);
          }
        });

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

        return allMatchesToSave;
      }
    );
  }

  private prepareCompetitionWindows(
    competitions: Competition[],
    allTeams: number[]
  ): CompetitionWindow[] {
    return competitions.map((compRaw) => {
      const comp = compRaw as SchedulableCompetition;
      const compTeams = allTeams.slice(0, comp.teams);
      let fixtures: MatchPair[] = [];
      let groupStructure: Record<string, number[]> | undefined;

      if (comp.type === "group_knockout") {
        const groupStage = CompetitionScheduler.generateGroupStageFixtures(
          compTeams,
          4,
          true
        );

        fixtures = groupStage.fixtures;
        groupStructure = groupStage.groups;
      } else if (comp.type === "league") {
        fixtures = CompetitionScheduler.generateLeagueFixtures(compTeams, true);
      } else if (comp.type === "knockout") {
        fixtures = CompetitionScheduler.generateKnockoutPairings(compTeams, 1);
      }

      return {
        id: comp.id,
        name: comp.name,
        window: comp.window || "national",
        startMonth: comp.startMonth || 1,
        endMonth: comp.endMonth || 12,
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

    const startDate = new Date(CALENDAR_CONFIG.STATE_WINDOW.start);
    const endDate = new Date(CALENDAR_CONFIG.STATE_WINDOW.end);

    this.processSchedulingLoop(
      stateComps,
      startDate,
      endDate,
      occupiedDates,
      allMatches,
      CALENDAR_CONFIG.NATIONAL_GAME_DAYS
    );
  }

  private scheduleNationalCompetitions(
    windows: CompetitionWindow[],
    occupiedDates: Map<string, Set<number>>,
    allMatches: ScheduledMatch[]
  ): void {
    const nationalComps = windows.filter((w) => w.window === "national");
    if (nationalComps.length === 0) return;

    const startDate = new Date(CALENDAR_CONFIG.NATIONAL_WINDOW.start);
    const endDate = new Date(CALENDAR_CONFIG.NATIONAL_WINDOW.end);

    this.processSchedulingLoop(
      nationalComps,
      startDate,
      endDate,
      occupiedDates,
      allMatches,
      CALENDAR_CONFIG.NATIONAL_GAME_DAYS
    );
  }

  private scheduleContinentalCompetitions(
    windows: CompetitionWindow[],
    occupiedDates: Map<string, Set<number>>,
    allMatches: ScheduledMatch[]
  ): void {
    const continentalComps = windows.filter((w) => w.window === "continental");
    if (continentalComps.length === 0) return;

    const startDate = new Date(CALENDAR_CONFIG.CONTINENTAL_WINDOW.start);
    const endDate = new Date(CALENDAR_CONFIG.CONTINENTAL_WINDOW.end);

    this.processSchedulingLoop(
      continentalComps,
      startDate,
      endDate,
      occupiedDates,
      allMatches,
      CALENDAR_CONFIG.CONTINENTAL_GAME_DAYS,
      CALENDAR_CONFIG.CONTINENTAL_ROUND_STEP
    );
  }

  private processSchedulingLoop(
    competitions: CompetitionWindow[],
    startDate: Date,
    endDate: Date,
    occupiedDates: Map<string, Set<number>>,
    allMatches: ScheduledMatch[],
    allowedDays: readonly number[],
    stepDays: number = CALENDAR_CONFIG.DEFAULT_ROUND_STEP
  ) {
    for (const comp of competitions) {
      const currentDate = new Date(startDate);
      const roundsToSchedule = this.getRounds(comp.fixtures);

      for (const round of roundsToSchedule) {
        let scheduled = false;

        while (currentDate <= endDate && !scheduled) {
          const dayOfWeek = currentDate.getDay();

          if (allowedDays.includes(dayOfWeek)) {
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
              scheduled = true;
            }
          }

          if (!scheduled) {
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }

        currentDate.setDate(currentDate.getDate() + stepDays);
      }
    }
  }

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

  private needsRest(
    teamId: number,
    currentDate: string,
    existingMatches: ScheduledMatch[]
  ): boolean {
    const restDays = CALENDAR_CONFIG.CONTINENTAL_REST_DAYS;
    const targetDate = new Date(currentDate);

    const datesToCheck: string[] = [];
    for (let i = 1; i <= restDays; i++) {
      const pastDate = new Date(targetDate);
      pastDate.setDate(pastDate.getDate() - i);
      datesToCheck.push(pastDate.toISOString().split("T")[0]);
    }

    return existingMatches.some((m) => {
      const isContinental = this.continentalCompIds.has(m.competitionId);
      const isTeamInvolved = m.homeTeamId === teamId || m.awayTeamId === teamId;
      const isRecent = datesToCheck.includes(m.date);

      return isContinental && isTeamInvolved && isRecent;
    });
  }

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
        return false;
      }
    }

    return true;
  }

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
