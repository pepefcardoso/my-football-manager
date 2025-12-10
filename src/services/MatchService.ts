import type { Team } from "../domain/models";
import { FinancialCategory } from "../domain/enums";
import { MatchEngine } from "../engine/MatchEngine";
import type { MatchConfig, MatchResult } from "../domain/types";
import { CompetitionScheduler } from "./CompetitionScheduler";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { BaseService } from "./BaseService";
import { Result } from "./types/ServiceResults";
import type { ServiceResult } from "./types/ServiceResults";

export class MatchService extends BaseService {
  private engines: Map<number, MatchEngine> = new Map();

  constructor(repositories: IRepositoryContainer) {
    super(repositories, "MatchService");
  }

  /**
   * Inicializa o motor de jogo para uma partida específica.
   * Carrega times, jogadores e configurações necessárias.
   */
  async initializeMatch(matchId: number): Promise<ServiceResult<void>> {
    return this.executeVoid("initializeMatch", matchId, async (id) => {
      await this.ensureEngineInitialized(id);
    });
  }

  /**
   * Inicia a partida (start).
   */
  async startMatch(matchId: number): Promise<ServiceResult<void>> {
    return this.executeVoid("startMatch", matchId, async (id) => {
      const engine = this.engines.get(id);
      if (!engine) {
        throw new Error(`Partida ${id} não inicializada.`);
      }
      engine.start();
    });
  }

  /**
   * Pausa a partida.
   */
  async pauseMatch(matchId: number): Promise<ServiceResult<void>> {
    return this.executeVoid("pauseMatch", matchId, async (id) => {
      const engine = this.engines.get(id);
      if (!engine) {
        throw new Error(`Partida ${id} não inicializada.`);
      }
      engine.pause();
    });
  }

  /**
   * Retoma a partida (resume).
   */
  async resumeMatch(matchId: number): Promise<ServiceResult<void>> {
    return this.executeVoid("resumeMatch", matchId, async (id) => {
      const engine = this.engines.get(id);
      if (!engine) {
        throw new Error(`Partida ${id} não inicializada.`);
      }
      engine.resume();
    });
  }

  /**
   * Simula um minuto da partida.
   */
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

  /**
   * Simula a partida completa instantaneamente.
   */
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

  /**
   * Obtém o estado atual da partida (para UI).
   */
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

  /**
   * Simula todas as partidas pendentes de uma data específica.
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

      return {
        matchesPlayed: results.length,
        results,
      };
    });
  }

  /**
   * Recupera ou inicializa a engine de uma partida.
   */
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

    const { ticketRevenue, attendance } = await this.calculateMatchRevenue(
      match,
      homeTeam
    );

    await this.repos.matches.updateMatchResult(
      matchId,
      result.homeScore,
      result.awayScore,
      attendance,
      ticketRevenue
    );

    await this.saveMatchEvents(matchId, result);
    await this.updatePlayerConditions(result);
    await this.processMatchFinancials(
      match,
      homeTeam,
      ticketRevenue,
      attendance
    );

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

    await this.updateFanSatisfaction(match, result);
    await this.checkCupProgression(matchId);
  }

  private async calculateMatchRevenue(
    match: any,
    homeTeam: any
  ): Promise<{ ticketRevenue: number; attendance: number }> {
    let matchImportance = 1.0;

    if (match.competitionId) {
      const competitions = await this.repos.competitions.findAll();
      const comp = competitions.find((c) => c.id === match.competitionId);

      if (comp) {
        if (comp.tier === 1) matchImportance *= 1.2;
        if (comp.type === "knockout") matchImportance *= 1.3;
        if (match.round && match.round > 30) matchImportance *= 1.2;
        matchImportance = Math.min(2.0, matchImportance);
      }
    }

    const satisfactionMultiplier = Math.max(
      0.3,
      Math.min(1.0, (homeTeam.fanSatisfaction ?? 50) / 100)
    );

    const baseAttendance =
      (homeTeam.stadiumCapacity ?? 10000) * satisfactionMultiplier;
    const expectedAttendance = baseAttendance * matchImportance;
    const randomFactor = 0.95 + Math.random() * 0.1;

    const attendance = Math.round(
      Math.min(
        homeTeam.stadiumCapacity ?? 10000,
        expectedAttendance * randomFactor
      )
    );

    const ticketRevenue = Math.round(attendance * 50);

    return { ticketRevenue, attendance };
  }

  private async saveMatchEvents(
    matchId: number,
    result: MatchResult
  ): Promise<void> {
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

    await this.repos.matches.createMatchEvents(eventsToSave);
  }

  private async updatePlayerConditions(result: MatchResult): Promise<void> {
    await this.repos.players.updateDailyStatsBatch(
      result.playerUpdates.map((u) => ({
        id: u.playerId,
        energy: u.energy,
        fitness: Math.max(0, 100 - (100 - u.energy)),
        moral: u.moral,
        isInjured: u.isInjured,
        injuryDays: u.injuryDays,
      }))
    );
  }

  private async processMatchFinancials(
    match: any,
    homeTeam: any,
    ticketRevenue: number,
    attendance: number
  ): Promise<void> {
    if (ticketRevenue > 0 && match.seasonId) {
      await this.repos.financial.addRecord({
        teamId: match.homeTeamId,
        seasonId: match.seasonId,
        date: match.date,
        type: "income",
        category: FinancialCategory.TICKET_SALES,
        amount: ticketRevenue,
        description: `Receita de Bilheteira - ${attendance.toLocaleString(
          "pt-PT"
        )} torcedores presentes`,
      });

      const currentBudget = homeTeam.budget ?? 0;
      await this.repos.teams.updateBudget(
        match.homeTeamId!,
        currentBudget + ticketRevenue
      );
    }
  }

  private async updateFanSatisfaction(
    match: any,
    result: MatchResult
  ): Promise<void> {
    const homeTeam = await this.repos.teams.findById(match.homeTeamId!);
    const awayTeam = await this.repos.teams.findById(match.awayTeamId!);

    if (!homeTeam || !awayTeam) return;

    const homeTeamRep = homeTeam.reputation || 0;
    const awayTeamRep = awayTeam.reputation || 0;

    let homeResult: "win" | "draw" | "loss" = "draw";
    if (result.homeScore > result.awayScore) homeResult = "win";
    else if (result.homeScore < result.awayScore) homeResult = "loss";

    await this.updateTeamSatisfaction(
      match.homeTeamId!,
      homeResult,
      true,
      awayTeamRep,
      homeTeamRep,
      homeTeam.fanSatisfaction ?? 50
    );

    let awayResult: "win" | "draw" | "loss" = "draw";
    if (result.awayScore > result.homeScore) awayResult = "win";
    else if (result.awayScore < result.homeScore) awayResult = "loss";

    await this.updateTeamSatisfaction(
      match.awayTeamId!,
      awayResult,
      false,
      homeTeamRep,
      awayTeamRep,
      awayTeam.fanSatisfaction ?? 50
    );
  }

  private async updateTeamSatisfaction(
    teamId: number,
    result: "win" | "draw" | "loss",
    isHomeGame: boolean,
    opponentReputation: number,
    teamReputation: number,
    currentSatisfaction: number
  ): Promise<void> {
    const reputationDiff = opponentReputation - teamReputation;
    let change = 0;

    if (result === "win") {
      change = 2 + Math.max(0, reputationDiff / 1000);
      if (isHomeGame) change += 1;
    } else if (result === "loss") {
      change = -3;
      if (reputationDiff > 2000) change += 1;
      if (isHomeGame) change -= 1;
    } else {
      if (reputationDiff > 500) change = 1;
      else if (reputationDiff < -500) change = -2;
      else change = 0;
    }

    change = Math.max(-5, Math.min(5, Math.round(change)));

    const newSatisfaction = Math.max(
      0,
      Math.min(100, currentSatisfaction + change)
    );

    if (newSatisfaction !== currentSatisfaction) {
      await this.repos.teams.update(teamId, {
        fanSatisfaction: newSatisfaction,
      });

      const symbol = change > 0 ? "+" : "";
      this.logger.info(
        `Satisfação da torcida atualizada: ${currentSatisfaction}% ➡️ ${newSatisfaction}% (${symbol}${change})`
      );
    }
  }

  private async checkCupProgression(matchId: number): Promise<void> {
    try {
      const match = await this.repos.matches.findById(matchId);
      if (!match || !match.competitionId || !match.seasonId || !match.round)
        return;

      const competition = (await this.repos.competitions.findAll()).find(
        (c) => c.id === match.competitionId
      );

      if (!competition || competition.type === "league") return;

      const allMatchesInRound = await this.repos.matches.findByTeamAndSeason(
        0,
        match.seasonId
      );

      const roundMatches = allMatchesInRound.filter(
        (m) =>
          m.competitionId === match.competitionId && m.round === match.round
      );

      const pending = roundMatches.some((m) => !m.isPlayed);
      if (pending) return;

      const nextRound = match.round + 1;

      if (roundMatches.length === 1) {
        this.logger.info(`🏆 Competição ${competition.name} encerrada!`);
        return;
      }

      const nextFixtures = CompetitionScheduler.generateNextRoundPairings(
        roundMatches,
        nextRound
      );

      const lastMatchDate = new Date(match.date);
      lastMatchDate.setDate(lastMatchDate.getDate() + 14);
      const nextDateStr = lastMatchDate.toISOString().split("T")[0];

      const matchesToSave = nextFixtures.map((f) => ({
        competitionId: competition.id,
        seasonId: match.seasonId,
        homeTeamId: f.homeTeamId,
        awayTeamId: f.awayTeamId,
        date: nextDateStr,
        round: nextRound,
        isPlayed: false,
        weather: "sunny",
      }));

      await this.repos.matches.createMany(matchesToSave as any);
      this.logger.info(
        `Próxima fase da ${competition.name} gerada: ${matchesToSave.length} partidas.`
      );
    } catch (error) {
      this.logger.error("Erro ao processar progressão de copa:", error);
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
    const homeStanding = await this.repos.competitions.getStandings(
      competitionId,
      seasonId
    );
    const homeData = homeStanding.find((s) => s.teamId === homeTeamId);

    const homeWin = homeScore > awayScore;
    const draw = homeScore === awayScore;

    await this.repos.competitions.updateStanding(
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

    await this.repos.competitions.updateStanding(
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
}
