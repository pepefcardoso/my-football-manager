import type { Player, TacticsConfig, Team } from "../domain/models";
import { MatchEngine } from "../engine/MatchEngine";
import type { MatchConfig, MatchResult, TeamLineup } from "../domain/types";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { BaseService } from "./BaseService";
import { Result } from "./types/ServiceResults";
import type { ServiceResult } from "./types/ServiceResults";
import { MatchResultProcessor } from "./match/MatchResultProcessor";
import { GameEventBus } from "./events/GameEventBus";
import { GameEventType } from "./events/GameEventTypes";
import { MatchDataValidator } from "./validators/MatchDataValidator";
import {
  MatchSubstitutionManager,
  type SubstitutionRequest,
} from "./match/MatchSubstitutionManager";
import {
  MatchTacticsManager,
  type UpdateLiveTacticsRequest,
} from "./match/MatchTacticsManager";
import type { FinanceService } from "./FinanceService";

export class MatchService extends BaseService {
  private engines: Map<number, MatchEngine> = new Map();
  private eventBus: GameEventBus;

  private resultProcessor: MatchResultProcessor;
  private substitutionManager: MatchSubstitutionManager;
  private tacticsManager: MatchTacticsManager;
  private financeService: FinanceService;

  constructor(
    repositories: IRepositoryContainer,
    eventBus: GameEventBus,
    financeService: FinanceService,
    resultProcessor: MatchResultProcessor,
    substitutionManager: MatchSubstitutionManager,
    tacticsManager: MatchTacticsManager
  ) {
    super(repositories, "MatchService");
    this.eventBus = eventBus;
    this.financeService = financeService;
    this.resultProcessor = resultProcessor;
    this.substitutionManager = substitutionManager;
    this.tacticsManager = tacticsManager;
  }

  async initializeMatch(matchId: number): Promise<ServiceResult<void>> {
    const validation = MatchDataValidator.validateMatchIds(matchId);
    if (!validation.isValid) {
      return Result.validation(validation.errors!.join(", "));
    }

    return this.executeVoid("initializeMatch", matchId, async (id) => {
      await this.ensureEngineInitialized(id);
    });
  }

  async startMatch(matchId: number): Promise<ServiceResult<void>> {
    const validation = MatchDataValidator.validateMatchIds(matchId);
    if (!validation.isValid) {
      return Result.validation(validation.errors!.join(", "));
    }

    return this.executeVoid("startMatch", matchId, async (id) => {
      const engine = this.engines.get(id);
      if (!engine) throw new Error(`Partida ${id} não inicializada.`);
      engine.start();
    });
  }

  async pauseMatch(matchId: number): Promise<ServiceResult<void>> {
    const validation = MatchDataValidator.validateMatchIds(matchId);
    if (!validation.isValid) {
      return Result.validation(validation.errors!.join(", "));
    }

    return this.executeVoid("pauseMatch", matchId, async (id) => {
      const engine = this.engines.get(id);
      if (!engine) throw new Error(`Partida ${id} não inicializada.`);
      engine.pause();
    });
  }

  async resumeMatch(matchId: number): Promise<ServiceResult<void>> {
    const validation = MatchDataValidator.validateMatchIds(matchId);
    if (!validation.isValid) {
      return Result.validation(validation.errors!.join(", "));
    }

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
    const validation = MatchDataValidator.validateMatchIds(matchId);
    if (!validation.isValid) {
      return Result.validation(validation.errors!.join(", "));
    }

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
    const validation = MatchDataValidator.validateMatchIds(matchId);
    if (!validation.isValid) {
      return Result.validation(validation.errors!.join(", "));
    }

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
    const validation = MatchDataValidator.validateMatchIds(matchId);
    if (!validation.isValid) {
      return Result.validation(validation.errors!.join(", "));
    }

    return this.execute("getMatchState", matchId, async (id) => {
      const engine = this.engines.get(id);
      if (!engine)
        throw new Error(`Partida ${id} não está carregada em memória.`);

      return {
        state: engine.getState(),
        currentMinute: engine.getCurrentMinute(),
        score: engine.getCurrentScore(),
        events: engine.getEvents(),
        homeLineup: {
          onField: engine.getHomePlayersOnField(),
          bench: engine.getHomeBench(),
        },
        awayLineup: {
          onField: engine.getAwayPlayersOnField(),
          bench: engine.getAwayBench(),
        },
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

  async substitutePlayer(
    request: SubstitutionRequest
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "substitutePlayer",
      request,
      async ({ matchId, isHome, playerOutId, playerInId }) => {
        const engine = this.engines.get(matchId);
        if (!engine) {
          throw new Error(
            `Partida ${matchId} não encontrada ou não inicializada.`
          );
        }

        const currentState = engine.getState();
        const onFieldPlayers = isHome
          ? engine.getHomePlayersOnField()
          : engine.getAwayPlayersOnField();
        const benchPlayers = isHome
          ? engine.getHomeBench()
          : engine.getAwayBench();
        const substitutionsUsed = engine.getSubstitutionsUsed(isHome);

        const validationResult =
          await this.substitutionManager.validateSubstitution(
            { matchId, isHome, playerOutId, playerInId },
            currentState,
            onFieldPlayers,
            benchPlayers,
            substitutionsUsed
          );

        if (Result.isFailure(validationResult)) {
          throw new Error(validationResult.error.message);
        }

        const validated = validationResult.data;

        const success = engine.substitute(isHome, playerOutId, playerInId);

        if (!success) {
          throw new Error("Falha técnica ao processar substituição no motor.");
        }

        const currentMinute = engine.getCurrentMinute();
        const recordResult = await this.substitutionManager.recordSubstitution(
          matchId,
          validated,
          currentMinute
        );

        if (Result.isFailure(recordResult)) {
          this.logger.warn(
            `Substituição executada, mas falha ao registrar no banco: ${recordResult.error.message}`
          );
        }

        engine.updateTeamStrengths();

        this.logger.info(
          `✅ Substituição concluída com sucesso: ${validated.playerOut.firstName} ➡️ ${validated.playerIn.firstName} (${validated.substitutionNumber}/5)`
        );
      }
    );
  }

  async updateLiveTactics(
    request: UpdateLiveTacticsRequest
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "updateLiveTactics",
      request,
      async ({ matchId, isHome, tactics }) => {
        const engine = this.engines.get(matchId);
        if (!engine) {
          throw new Error(
            `Partida ${matchId} não encontrada ou não inicializada. Táticas só podem ser alteradas durante partidas ativas.`
          );
        }

        const updateResult = await this.tacticsManager.updateLiveTactics({
          matchId,
          isHome,
          tactics,
        });

        if (Result.isFailure(updateResult)) {
          throw new Error(updateResult.error.message);
        }

        engine.updateTeamStrengths();

        this.logger.info(
          `🎯 Táticas atualizadas para o time ${
            isHome ? "mandante" : "visitante"
          } na partida ${matchId}.`
        );
      }
    );
  }

  async analyzeTactics(
    matchId: number,
    isHome: boolean
  ): Promise<ServiceResult<any>> {
    return this.tacticsManager.analyzeTactics(matchId, isHome);
  }

  async suggestTactics(
    matchId: number,
    isHome: boolean
  ): Promise<ServiceResult<Partial<TacticsConfig>>> {
    const engine = this.engines.get(matchId);
    if (!engine) {
      return Result.fail("Partida não está carregada em memória.");
    }

    const currentMinute = engine.getCurrentMinute();
    const score = engine.getCurrentScore();

    return this.tacticsManager.suggestTactics(
      matchId,
      isHome,
      currentMinute,
      score
    );
  }

  async savePreMatchTactics(
    matchId: number,
    homeLineup: TeamLineup,
    awayLineup: TeamLineup
  ): Promise<ServiceResult<void>> {
    return this.executeVoid("savePreMatchTactics", { matchId }, async () => {
      const match = await this.repos.matches.findById(matchId);
      if (!match) throw new Error("Partida não encontrada.");

      const matchRepo = this.repos.matches as any;

      if (matchRepo.upsertMatchTactics) {
        await matchRepo.upsertMatchTactics(
          matchId,
          match.homeTeamId!,
          true,
          homeLineup
        );

        await matchRepo.upsertMatchTactics(
          matchId,
          match.awayTeamId!,
          false,
          awayLineup
        );
      }
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

    const homeTeam = this.mapToDomainTeam(homeTeamData);
    const awayTeam = this.mapToDomainTeam(awayTeamData);

    const allHomePlayers = await this.repos.players.findByTeamId(
      match.homeTeamId!
    );
    const allAwayPlayers = await this.repos.players.findByTeamId(
      match.awayTeamId!
    );

    const homePlayers = allHomePlayers.filter((p) => !p.isInjured);
    const awayPlayers = allAwayPlayers.filter((p) => !p.isInjured);

    const matchRepo = this.repos.matches as any;
    let savedHomeTactics = null;
    let savedAwayTactics = null;

    if (matchRepo.findMatchTactics) {
      savedHomeTactics = await matchRepo.findMatchTactics(
        matchId,
        match.homeTeamId!
      );
      savedAwayTactics = await matchRepo.findMatchTactics(
        matchId,
        match.awayTeamId!
      );
    }

    const config: MatchConfig = {
      homeTeam,
      awayTeam,
      homePlayers,
      awayPlayers,
      homeTactics: this.loadOrGenerateLineup(
        savedHomeTactics,
        homeTeam,
        homePlayers
      ),
      awayTactics: this.loadOrGenerateLineup(
        savedAwayTactics,
        awayTeam,
        awayPlayers
      ),
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

  private mapToDomainTeam(dbTeam: any): Team {
    return {
      ...dbTeam,
      primaryColor: dbTeam.primaryColor ?? "#000000",
      secondaryColor: dbTeam.secondaryColor ?? "#ffffff",
      isHuman: dbTeam.isHuman ?? false,
    };
  }

  private loadOrGenerateLineup(
    saved: any,
    team: Team,
    availablePlayers: Player[]
  ): TeamLineup {
    if (saved && saved.startingLineup && saved.startingLineup.length > 0) {
      return {
        formation: saved.formation,
        starters: saved.startingLineup,
        bench: saved.bench,
        tactics: {
          style: saved.gameStyle,
          marking: saved.marking,
          mentality: saved.mentality,
          passingDirectness: saved.passingDirectness,
        },
      };
    }
    return this.createDefaultLineup(team, availablePlayers);
  }

  private createDefaultLineup(team: Team, players: Player[]): TeamLineup {
    return {
      formation: team.defaultFormation || "4-4-2",
      starters: players.slice(0, 11).map((p) => p.id),
      bench: players.slice(11, 18).map((p) => p.id),
      tactics: {
        style: team.defaultGameStyle || "balanced",
        marking: team.defaultMarking || "man_to_man",
        mentality: team.defaultMentality || "normal",
        passingDirectness: team.defaultPassingDirectness || "mixed",
      },
    };
  }

  private async saveMatchResult(
    matchId: number,
    result: MatchResult
  ): Promise<void> {
    const match = await this.repos.matches.findById(matchId);
    if (!match) return;

    let ticketRevenue = 0;
    let attendance = 0;

    if (match.homeTeamId) {
      const revenueResult = await this.financeService.processMatchdayRevenue(
        match.homeTeamId,
        matchId,
        0,
        1.0
      );

      if (Result.isSuccess(revenueResult)) {
        ticketRevenue = revenueResult.data;
        const team = await this.repos.teams.findById(match.homeTeamId);
        if (team) {
          attendance = Math.round((team.stadiumCapacity || 10000) * 0.7);
        }
      }
    }

    await this.resultProcessor.processResult(
      matchId,
      result,
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
