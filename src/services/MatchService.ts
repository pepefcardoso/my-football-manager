import {
  MatchEngine,
  type MatchConfig,
  type MatchResult,
} from "../engine/MatchEngine";
import { matchRepository } from "../repositories/MatchRepository";
import { playerRepository } from "../repositories/PlayerRepository";
import { teamRepository } from "../repositories/TeamRepository";
import { competitionRepository } from "../repositories/CompetitionRepository";
import { financialRepository } from "../repositories/FinancialRepository";
import { FinancialCategory, type Team } from "../domain/types";

export class MatchService {
  private engines: Map<number, MatchEngine> = new Map();

  async initializeMatch(matchId: number): Promise<MatchEngine | null> {
    try {
      const match = await matchRepository.findById(matchId);
      if (!match) return null;

      const homeTeamData = await teamRepository.findById(match.homeTeamId!);
      const awayTeamData = await teamRepository.findById(match.awayTeamId!);

      if (!homeTeamData || !awayTeamData) return null;

      const mapToDomainTeam = (dbTeam: typeof homeTeamData): Team => ({
        ...dbTeam,
        primaryColor: dbTeam.primaryColor ?? "#000000",
        secondaryColor: dbTeam.secondaryColor ?? "#ffffff",
        reputation: dbTeam.reputation ?? 0,
        budget: dbTeam.budget ?? 0,
        stadiumCapacity: dbTeam.stadiumCapacity ?? 10000,
        stadiumQuality: dbTeam.stadiumQuality ?? 50,
        trainingCenterQuality: dbTeam.trainingCenterQuality ?? 50,
        youthAcademyQuality: dbTeam.youthAcademyQuality ?? 50,
        fanSatisfaction: dbTeam.fanSatisfaction ?? 50,
        fanBase: dbTeam.fanBase ?? 10000,
        isHuman: dbTeam.isHuman ?? false,
      });

      const homeTeam = mapToDomainTeam(homeTeamData);
      const awayTeam = mapToDomainTeam(awayTeamData);

      if (!homeTeam || !awayTeam) return null;

      const allHomePlayers = await playerRepository.findByTeamId(
        match.homeTeamId!
      );
      const allAwayPlayers = await playerRepository.findByTeamId(
        match.awayTeamId!
      );

      const homePlayers = allHomePlayers.filter((p) => !p.isInjured);
      const awayPlayers = allAwayPlayers.filter((p) => !p.isInjured);

      const config: MatchConfig = {
        homeTeam,
        awayTeam,
        homePlayers,
        awayPlayers,
        weather: match.weather as any,
      };

      const engine = new MatchEngine(config);
      this.engines.set(matchId, engine);

      return engine;
    } catch (error) {
      console.error("Erro ao inicializar partida:", error);
      return null;
    }
  }

  startMatch(matchId: number): boolean {
    const engine = this.engines.get(matchId);
    if (!engine) return false;

    engine.start();
    return true;
  }

  pauseMatch(matchId: number): boolean {
    const engine = this.engines.get(matchId);
    if (!engine) return false;

    engine.pause();
    return true;
  }

  resumeMatch(matchId: number): boolean {
    const engine = this.engines.get(matchId);
    if (!engine) return false;

    engine.resume();
    return true;
  }

  simulateMinute(matchId: number): {
    currentMinute: number;
    score: { home: number; away: number };
    newEvents: any[];
  } | null {
    const engine = this.engines.get(matchId);
    if (!engine) return null;

    const eventsBefore = engine.getEvents().length;
    engine.simulateMinute();

    const allEvents = engine.getEvents();
    const newEvents = allEvents.slice(eventsBefore);

    return {
      currentMinute: engine.getCurrentMinute(),
      score: engine.getCurrentScore(),
      newEvents,
    };
  }

  async simulateFullMatch(matchId: number): Promise<MatchResult | null> {
    const engine = this.engines.get(matchId);
    if (!engine) {
      const initialized = await this.initializeMatch(matchId);
      if (!initialized) return null;
      return this.simulateFullMatch(matchId);
    }

    engine.start();

    while (engine.getCurrentMinute() < 90) {
      engine.simulateMinute();
    }

    const result = engine.getMatchResult();

    await this.saveMatchResult(matchId, result);

    this.engines.delete(matchId);

    return result;
  }

  private async saveMatchResult(
    matchId: number,
    result: MatchResult
  ): Promise<void> {
    try {
      const match = await matchRepository.findById(matchId);
      if (!match) return;

      const homeTeam = await teamRepository.findById(match.homeTeamId!);
      const ticketPrice = 50;
      const attendance = homeTeam
        ? Math.round(
            (homeTeam.stadiumCapacity ?? 0) *
              (homeTeam.fanSatisfaction ?? 50 / 100) *
              0.8
          )
        : 0;
      const ticketRevenue = attendance * ticketPrice;

      await matchRepository.updateMatchResult(
        matchId,
        result.homeScore,
        result.awayScore,
        attendance,
        ticketRevenue
      );

      const eventsToSave = result.events
        .filter((e) =>
          ["goal", "yellow_card", "red_card", "injury"].includes(e.type)
        )
        .map((e) => ({
          matchId,
          minute: e.minute,
          type: e.type,
          teamId: e.teamId,
          playerId: e.playerId || null,
          description: e.description,
        }));

      await matchRepository.createMatchEvents(eventsToSave);

      await playerRepository.updateDailyStatsBatch(
        result.playerUpdates.map((u) => ({
          id: u.playerId,
          energy: u.energy,
          fitness: Math.max(0, 100 - (100 - u.energy)),
          moral: u.moral,
          isInjured: u.isInjured,
          injuryDays: u.injuryDays,
        }))
      );

      if (ticketRevenue > 0 && match.seasonId) {
        await financialRepository.addRecord({
          teamId: match.homeTeamId,
          seasonId: match.seasonId,
          date: match.date,
          type: "income",
          category: FinancialCategory.TICKET_SALES,
          amount: ticketRevenue,
          description: `Receita de bilheteira - ${attendance} torcedores`,
        });
      }

      if (match.competitionId && match.seasonId) {
        await this.updateStandings(
          match.competitionId,
          match.seasonId,
          match.homeTeamId!,
          match.awayTeamId!,
          result.homeScore,
          result.awayScore
        );
      }
    } catch (error) {
      console.error("Erro ao salvar resultado da partida:", error);
    }
  }

  private async updateStandings(
    competitionId: number,
    seasonId: number,
    homeTeamId: number,
    awayTeamId: number,
    homeScore: number,
    awayScore: number
  ): Promise<void> {
    const homeStanding = await competitionRepository.getStandings(
      competitionId,
      seasonId
    );
    const homeData = homeStanding.find((s) => s.teamId === homeTeamId);

    const homeWin = homeScore > awayScore;
    const draw = homeScore === awayScore;

    await competitionRepository.updateStanding(
      competitionId,
      seasonId,
      homeTeamId,
      {
        played: (homeData?.played || 0) + 1,
        wins: (homeData?.wins || 0) + (homeWin ? 1 : 0),
        draws: (homeData?.draws || 0) + (draw ? 1 : 0),
        losses: (homeData?.losses || 0) + (!homeWin && !draw ? 1 : 0),
        goalsFor: (homeData?.goalsFor || 0) + homeScore,
        goalsAgainst: (homeData?.goalsAgainst || 0) + awayScore,
        points: (homeData?.points || 0) + (homeWin ? 3 : draw ? 1 : 0),
      }
    );

    const awayData = homeStanding.find((s) => s.teamId === awayTeamId);
    const awayWin = awayScore > homeScore;

    await competitionRepository.updateStanding(
      competitionId,
      seasonId,
      awayTeamId,
      {
        played: (awayData?.played || 0) + 1,
        wins: (awayData?.wins || 0) + (awayWin ? 1 : 0),
        draws: (awayData?.draws || 0) + (draw ? 1 : 0),
        losses: (awayData?.losses || 0) + (!awayWin && !draw ? 1 : 0),
        goalsFor: (awayData?.goalsFor || 0) + awayScore,
        goalsAgainst: (awayData?.goalsAgainst || 0) + homeScore,
        points: (awayData?.points || 0) + (awayWin ? 3 : draw ? 1 : 0),
      }
    );
  }

  getMatchState(matchId: number) {
    const engine = this.engines.get(matchId);
    if (!engine) return null;

    return {
      state: engine.getState(),
      currentMinute: engine.getCurrentMinute(),
      score: engine.getCurrentScore(),
      events: engine.getEvents(),
    };
  }

  async simulateMatchesOfDate(date: string): Promise<{
    matchesPlayed: number;
    results: Array<{ matchId: number; result: MatchResult }>;
  }> {
    const matches = await matchRepository.findPendingMatchesByDate(date);

    const results: Array<{ matchId: number; result: MatchResult }> = [];

    for (const match of matches) {
      const result = await this.simulateFullMatch(match.id);
      if (result) {
        results.push({ matchId: match.id, result });
      }
    }

    return {
      matchesPlayed: results.length,
      results,
    };
  }
}

export const matchService = new MatchService();
