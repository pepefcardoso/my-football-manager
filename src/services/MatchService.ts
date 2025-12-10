import type { Team } from "../domain/models";
import { MatchEngine } from "../engine/MatchEngine";
import type { MatchConfig, MatchResult } from "../domain/types";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { BaseService } from "./BaseService";
import { Result } from "./types/ServiceResults";
import type { ServiceResult } from "./types/ServiceResults";
import { MatchResultProcessor } from "./match/MatchResultProcessor";
import { MatchRevenueCalculator } from "./match/MatchRevenueCalculator";
import { MatchFinancialsProcessor } from "./match/MatchFinancialsProcessor";
import { GameEventBus } from "./events/GameEventBus";
import { GameEventType } from "./events/GameEventTypes";

export class MatchService extends BaseService {
  private engines: Map<number, MatchEngine> = new Map();
  private eventBus: GameEventBus;

  private resultProcessor: MatchResultProcessor;
  private revenueCalculator: MatchRevenueCalculator;
  private financialsProcessor: MatchFinancialsProcessor;

  constructor(repositories: IRepositoryContainer, eventBus: GameEventBus) {
    super(repositories, "MatchService");
    this.eventBus = eventBus;

    this.resultProcessor = new MatchResultProcessor(repositories);
    this.revenueCalculator = new MatchRevenueCalculator(repositories);
    this.financialsProcessor = new MatchFinancialsProcessor(repositories);
  }

  async initializeMatch(matchId: number): Promise<ServiceResult<void>> {
    return this.executeVoid("initializeMatch", matchId, async (id) => {
      await this.ensureEngineInitialized(id);
    });
  }

  async startMatch(matchId: number): Promise<ServiceResult<void>> {
    return this.executeVoid("startMatch", matchId, async (id) => {
      const engine = this.engines.get(id);
      if (!engine) throw new Error(`Partida ${id} não inicializada.`);
      engine.start();
    });
  }

  async pauseMatch(matchId: number): Promise<ServiceResult<void>> {
    return this.executeVoid("pauseMatch", matchId, async (id) => {
      const engine = this.engines.get(id);
      if (!engine) throw new Error(`Partida ${id} não inicializada.`);
      engine.pause();
    });
  }

  async resumeMatch(matchId: number): Promise<ServiceResult<void>> {
    return this.executeVoid("resumeMatch", matchId, async (id) => {
      const engine = this.engines.get(id);
      if (!engine) throw new Error(`Partida ${id} não inicializada.`);
      engine.resume();
    });
  }

  async simulateMinute(matchId: number): Promise<
    ServiceResult<{
      currentMinute: number;
      score: { home: number; away: number };
      newEvents: any[];
    }>
  > {
    return this.execute("simulateMinute", matchId, async (id) => {
      const engine = this.engines.get(id);
      if (!engine) throw new Error(`Partida ${id} não inicializada.`);

      const eventsBefore = engine.getEvents().length;
      engine.simulateMinute();
      const allEvents = engine.getEvents();
      const newEvents = allEvents.slice(eventsBefore);

      return {
        currentMinute: engine.getCurrentMinute(),
        score: engine.getCurrentScore(),
        newEvents,
      };
    });
  }

  async simulateFullMatch(
    matchId: number
  ): Promise<ServiceResult<MatchResult>> {
    return this.execute("simulateFullMatch", matchId, async (id) => {
      const engine = await this.ensureEngineInitialized(id);
      engine.simulateToCompletion();

      const result = engine.getMatchResult();
      await this.saveMatchResult(id, result);

      this.engines.delete(id);
      return result;
    });
  }

  async getMatchState(matchId: number): Promise<ServiceResult<any>> {
    return this.execute("getMatchState", matchId, async (id) => {
      const engine = this.engines.get(id);
      if (!engine)
        throw new Error(`Partida ${id} não está carregada em memória.`);

      return {
        state: engine.getState(),
        currentMinute: engine.getCurrentMinute(),
        score: engine.getCurrentScore(),
        events: engine.getEvents(),
      };
    });
  }

  async simulateMatchesOfDate(date: string): Promise<
    ServiceResult<{
      matchesPlayed: number;
      results: Array<{ matchId: number; result: MatchResult }>;
    }>
  > {
    return this.execute("simulateMatchesOfDate", date, async (dateStr) => {
      const matches = await this.repos.matches.findPendingMatchesByDate(
        dateStr
      );
      const results: Array<{ matchId: number; result: MatchResult }> = [];

      for (const match of matches) {
        const resultWrapper = await this.simulateFullMatch(match.id);
        if (Result.isSuccess(resultWrapper)) {
          results.push({ matchId: match.id, result: resultWrapper.data });
        }
      }

      return { matchesPlayed: results.length, results };
    });
  }

  private async ensureEngineInitialized(matchId: number): Promise<MatchEngine> {
    let engine = this.engines.get(matchId);
    if (engine) return engine;

    const match = await this.repos.matches.findById(matchId);
    if (!match) throw new Error(`Partida ${matchId} não encontrada.`);

    const homeTeamData = await this.repos.teams.findById(match.homeTeamId!);
    const awayTeamData = await this.repos.teams.findById(match.awayTeamId!);
    if (!homeTeamData || !awayTeamData)
      throw new Error("Times não encontrados.");

    const mapToDomainTeam = (dbTeam: any): Team => ({
      ...dbTeam,
      primaryColor: dbTeam.primaryColor ?? "#000000",
      secondaryColor: dbTeam.secondaryColor ?? "#ffffff",
      isHuman: dbTeam.isHuman ?? false,
    });

    const homeTeam = mapToDomainTeam(homeTeamData);
    const awayTeam = mapToDomainTeam(awayTeamData);

    const allHomePlayers = await this.repos.players.findByTeamId(
      match.homeTeamId!
    );
    const allAwayPlayers = await this.repos.players.findByTeamId(
      match.awayTeamId!
    );

    const homePlayers = allHomePlayers.filter((p) => !p.isInjured);
    const awayPlayers = allAwayPlayers.filter((p) => !p.isInjured);

    const config: MatchConfig = {
      homeTeam,
      awayTeam,
      homePlayers,
      awayPlayers,
      weather: (match.weather as any) || "sunny",
    };

    let isKnockout = false;
    if (match.competitionId) {
      const competitions = await this.repos.competitions.findAll();
      const competition = competitions.find(
        (c) => c.id === match.competitionId
      );
      if (
        competition &&
        (competition.type === "knockout" ||
          competition.type === "group_knockout")
      ) {
        isKnockout = true;
      }
    }

    engine = new MatchEngine(config, isKnockout);
    this.engines.set(matchId, engine);
    return engine;
  }

  private async saveMatchResult(
    matchId: number,
    result: MatchResult
  ): Promise<void> {
    const match = await this.repos.matches.findById(matchId);
    if (!match) return;

    const homeTeam = await this.repos.teams.findById(match.homeTeamId!);
    if (!homeTeam) return;

    const revenueResult = await this.revenueCalculator.calculateRevenue({
      matchId,
      homeTeam,
      competitionId: match.competitionId,
      round: match.round,
    });
    const { ticketRevenue, attendance } = Result.unwrapOr(revenueResult, {
      ticketRevenue: 0,
      attendance: 0,
    });

    await this.resultProcessor.processResult(
      matchId,
      result,
      ticketRevenue,
      attendance
    );

    await this.financialsProcessor.processFinancials(
      match,
      homeTeam,
      ticketRevenue,
      attendance
    );

    await this.eventBus.publish(GameEventType.MATCH_FINISHED, {
      matchId,
      homeTeamId: match.homeTeamId!,
      awayTeamId: match.awayTeamId!,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      competitionId: match.competitionId || undefined,
      seasonId: match.seasonId || undefined,
      round: match.round || undefined,
      ticketRevenue,
      attendance,
    });
  }
}
