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
import { MatchFanSatisfactionProcessor } from "./match/MatchFanSatisfactionProcessor";
import { CupProgressionManager } from "./match/CupProgressionManager";

export class MatchService extends BaseService {
  private engines: Map<number, MatchEngine> = new Map();

  private resultProcessor: MatchResultProcessor;
  private revenueCalculator: MatchRevenueCalculator;
  private financialsProcessor: MatchFinancialsProcessor;
  private fanSatisfactionProcessor: MatchFanSatisfactionProcessor;
  private cupManager: CupProgressionManager;

  constructor(repositories: IRepositoryContainer) {
    super(repositories, "MatchService");
    this.resultProcessor = new MatchResultProcessor(repositories);
    this.revenueCalculator = new MatchRevenueCalculator(repositories);
    this.financialsProcessor = new MatchFinancialsProcessor(repositories);
    this.fanSatisfactionProcessor = new MatchFanSatisfactionProcessor(
      repositories
    );
    this.cupManager = new CupProgressionManager(repositories);
  }

  async initializeMatch(matchId: number): Promise<ServiceResult<void>> {
    return this.executeVoid("initializeMatch", matchId, async (id) => {
      await this.ensureEngineInitialized(id);
    });
  }

  async startMatch(matchId: number): Promise<ServiceResult<void>> {
    return this.executeVoid("startMatch", matchId, async (id) => {
      const engine = this.engines.get(id);
      if (!engine) {
        throw new Error(`Partida ${id} não inicializada.`);
      }
      engine.start();
    });
  }

  async pauseMatch(matchId: number): Promise<ServiceResult<void>> {
    return this.executeVoid("pauseMatch", matchId, async (id) => {
      const engine = this.engines.get(id);
      if (!engine) {
        throw new Error(`Partida ${id} não inicializada.`);
      }
      engine.pause();
    });
  }

  async resumeMatch(matchId: number): Promise<ServiceResult<void>> {
    return this.executeVoid("resumeMatch", matchId, async (id) => {
      const engine = this.engines.get(id);
      if (!engine) {
        throw new Error(`Partida ${id} não inicializada.`);
      }
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
      if (!engine) {
        throw new Error(`Partida ${id} não inicializada.`);
      }

      const eventsBefore = engine.getEvents().length;
      engine.simulateMinute();

      const allEvents = engine.getEvents();
      const newEvents = allEvents.slice(eventsBefore);

      if (newEvents.length > 0) {
        this.logger.debug(
          `Eventos no minuto ${engine.getCurrentMinute()}:`,
          newEvents
        );
      }

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

      this.logger.info(
        `Simulação completa finalizada para partida ${id}. Placar: ${result.homeScore}-${result.awayScore}`
      );

      return result;
    });
  }

  async getMatchState(matchId: number): Promise<ServiceResult<any>> {
    return this.execute("getMatchState", matchId, async (id) => {
      const engine = this.engines.get(id);
      if (!engine) {
        throw new Error(`Partida ${id} não está carregada em memória.`);
      }

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

      return {
        matchesPlayed: results.length,
        results,
      };
    });
  }

  private async ensureEngineInitialized(matchId: number): Promise<MatchEngine> {
    let engine = this.engines.get(matchId);
    if (engine) return engine;

    const match = await this.repos.matches.findById(matchId);
    if (!match) {
      throw new Error(`Partida ${matchId} não encontrada no banco de dados.`);
    }

    const homeTeamData = await this.repos.teams.findById(match.homeTeamId!);
    const awayTeamData = await this.repos.teams.findById(match.awayTeamId!);

    if (!homeTeamData || !awayTeamData) {
      throw new Error("Times não encontrados para a partida.");
    }

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
    this.logger.info(`Engine inicializada para partida ${matchId}.`);

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

    if (match.competitionId && match.seasonId) {
      await this.resultProcessor.updateStandings(
        match.competitionId,
        match.seasonId,
        match.homeTeamId!,
        match.awayTeamId!,
        result.homeScore,
        result.awayScore
      );
    }

    await this.fanSatisfactionProcessor.updateSatisfactionForMatch(
      matchId,
      result.homeScore,
      result.awayScore
    );

    await this.cupManager.checkAndProgressCup(matchId);
  }
}
