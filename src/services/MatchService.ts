import type { Player, Team } from "../domain/models";
import { MatchEngine } from "../engine/MatchEngine";
import type {
  MatchConfig,
  MatchResult,
  TeamLineup,
  TacticsConfig,
} from "../domain/types";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { BaseService } from "./BaseService";
import { Result } from "./types/ServiceResults";
import type { ServiceResult } from "./types/ServiceResults";
import { MatchResultProcessor } from "./match/MatchResultProcessor";
import { MatchRevenueCalculator } from "./match/MatchRevenueCalculator";
import { MatchFinancialsProcessor } from "./match/MatchFinancialsProcessor";
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

export class MatchService extends BaseService {
  private engines: Map<number, MatchEngine> = new Map();
  private eventBus: GameEventBus;

  private resultProcessor: MatchResultProcessor;
  private revenueCalculator: MatchRevenueCalculator;
  private financialsProcessor: MatchFinancialsProcessor;
  private substitutionManager: MatchSubstitutionManager;
  private tacticsManager: MatchTacticsManager;

  constructor(repositories: IRepositoryContainer, eventBus: GameEventBus) {
    super(repositories, "MatchService");
    this.eventBus = eventBus;

    this.resultProcessor = new MatchResultProcessor(repositories);
    this.revenueCalculator = new MatchRevenueCalculator(repositories);
    this.financialsProcessor = new MatchFinancialsProcessor(repositories);
    this.substitutionManager = new MatchSubstitutionManager(repositories);
    this.tacticsManager = new MatchTacticsManager(repositories);
  }

  /**
   * Inicializa o motor de jogo (MatchEngine) para uma partida específica.
   * Carrega os dados dos times, jogadores e configurações na memória para permitir a simulação.
   *
   * @param matchId - O ID único da partida a ser inicializada.
   * @returns Um ServiceResult vazio em caso de sucesso ou erro de validação.
   * @throws Error se os times ou a partida não forem encontrados no banco de dados.
   *
   * @example
   * await matchService.initializeMatch(105);
   */
  async initializeMatch(matchId: number): Promise<ServiceResult<void>> {
    const validation = MatchDataValidator.validateMatchIds(matchId);
    if (!validation.isValid) {
      return Result.validation(validation.errors!.join(", "));
    }

    return this.executeVoid("initializeMatch", matchId, async (id) => {
      await this.ensureEngineInitialized(id);
    });
  }

  /**
   * Inicia a simulação de uma partida que foi previamente inicializada.
   * Altera o estado interno do motor para 'PLAYING'.
   *
   * @param matchId - O ID da partida.
   * @returns Um ServiceResult vazio.
   * @throws Error se o motor da partida não tiver sido inicializado.
   */
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

  /**
   * Pausa a simulação de uma partida em andamento.
   *
   * @param matchId - O ID da partida.
   * @returns Um ServiceResult vazio.
   * @throws Error se o motor da partida não estiver carregado.
   */
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

  /**
   * Retoma a simulação de uma partida pausada.
   *
   * @param matchId - O ID da partida.
   * @returns Um ServiceResult vazio.
   * @throws Error se o motor da partida não estiver carregado.
   */
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

  /**
   * Avança a simulação da partida em um minuto.
   * Gera eventos, atualiza o placar e retorna o estado atualizado.
   *
   * @param matchId - O ID da partida.
   * @returns Objeto contendo o minuto atual, o placar e os novos eventos gerados neste ciclo.
   * @throws Error se o motor da partida não estiver carregado.
   */
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

  /**
   * Simula uma partida inteira (ou o restante dela) instantaneamente.
   * Persiste o resultado, estatísticas e atualiza a tabela do campeonato.
   *
   * @param matchId - O ID da partida.
   * @returns O resultado completo da partida (MatchResult).
   */
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

  /**
   * Recupera o estado atual de uma partida carregada na memória (para UI).
   *
   * @param matchId - O ID da partida.
   * @returns Objeto com estado, minuto, placar e histórico de eventos.
   * @throws Error se a partida não estiver em memória.
   */
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
      };
    });
  }

  /**
   * Simula todas as partidas pendentes para uma data específica.
   * Útil para avançar o dia e processar jogos da CPU.
   *
   * @param date - A data no formato 'YYYY-MM-DD'.
   * @returns Resumo das partidas jogadas e seus resultados.
   */
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

  /**
   * 🆕 TASK 4.2: Realiza uma substituição seguindo as regras FIFA.
   *
   * Validações aplicadas:
   * - Limite de 5 substituições por time
   * - Partida deve estar pausada
   * - Jogador a sair deve estar em campo
   * - Jogador a entrar deve estar no banco
   * - Nenhum dos dois pode estar lesionado
   *
   * @param request - Dados da substituição (matchId, isHome, playerOutId, playerInId)
   * @returns ServiceResult void
   * @throws Error se alguma regra FIFA for violada
   *
   * @example
   * await matchService.substitutePlayer({
   *   matchId: 42,
   *   isHome: true,
   *   playerOutId: 105,
   *   playerInId: 78
   * });
   */
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

  /**
   * @param request - Dados da mudança tática
   * @returns ServiceResult void
   *
   * @example
   * await matchService.updateLiveTactics({
   *   matchId: 42,
   *   isHome: true,
   *   tactics: {
   *     mentality: "ultra_attacking",
   *     style: "pressing"
   *   }
   * });
   */
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

        // TODO adicionar: engine.updateTactics(isHome, tactics)
        engine.updateTeamStrengths();

        this.logger.info(
          `🎯 Táticas atualizadas para o time ${
            isHome ? "mandante" : "visitante"
          } na partida ${matchId}.`
        );
      }
    );
  }

  /**
   * @param matchId - ID da partida
   * @param isHome - Time a analisar
   * @returns Análise tática com recomendações
   */
  async analyzeTactics(
    matchId: number,
    isHome: boolean
  ): Promise<ServiceResult<any>> {
    return this.tacticsManager.analyzeTactics(matchId, isHome);
  }

  /**
   * @param matchId - ID da partida
   * @param isHome - Time a sugerir
   * @returns Sugestão tática
   */
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

    const createDefaultLineup = (
      team: Team,
      players: Player[]
    ): TeamLineup => ({
      formation: team.defaultFormation || "4-4-2",
      starters: players.slice(0, 11).map((p) => p.id),
      bench: players.slice(11, 18).map((p) => p.id),
      tactics: {
        style: team.defaultGameStyle || "balanced",
        marking: team.defaultMarking || "man_to_man",
        mentality: team.defaultMentality || "normal",
        passingDirectness: team.defaultPassingDirectness || "mixed",
      },
    });

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
      homeTactics: createDefaultLineup(homeTeam, homePlayers),
      awayTactics: createDefaultLineup(awayTeam, awayPlayers),
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
