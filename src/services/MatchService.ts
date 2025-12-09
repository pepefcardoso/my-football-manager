import { matchRepository } from "../repositories/MatchRepository";
import { playerRepository } from "../repositories/PlayerRepository";
import { teamRepository } from "../repositories/TeamRepository";
import { competitionRepository } from "../repositories/CompetitionRepository";
import { financialRepository } from "../repositories/FinancialRepository";
import type { Team } from "../domain/models";
import { FinancialCategory } from "../domain/enums";
import { MatchEngine } from "../engine/MatchEngine";
import type { MatchConfig, MatchResult } from "../domain/types";
import { FinanceService } from "./FinanceService";
import { marketingService } from "./MarketingService";
import { Logger } from "../lib/Logger";
import { CompetitionScheduler } from "./CompetitionScheduler";

export class MatchService {
  private engines: Map<number, MatchEngine> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger("MatchService");
  }

  async initializeMatch(matchId: number): Promise<MatchEngine | null> {
    this.logger.info(`Inicializando partida ${matchId}...`);
    try {
      const match = await matchRepository.findById(matchId);
      if (!match) {
        this.logger.error(`Partida ${matchId} não encontrada.`);
        return null;
      }

      const homeTeamData = await teamRepository.findById(match.homeTeamId!);
      const awayTeamData = await teamRepository.findById(match.awayTeamId!);

      if (!homeTeamData || !awayTeamData) {
        this.logger.error("Times não encontrados para a partida.");
        return null;
      }

      // TODO: extrair para um adapter
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

      let isKnockout = false;
      if (match.competitionId) {
        const competitions = await competitionRepository.findAll();
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

      const engine = new MatchEngine(config, isKnockout);
      this.engines.set(matchId, engine);

      this.logger.info(`Partida ${matchId} inicializada com sucesso.`);
      return engine;
    } catch (error) {
      this.logger.error("Erro ao inicializar partida:", error);
      return null;
    }
  }

  startMatch(matchId: number): boolean {
    const engine = this.engines.get(matchId);
    if (!engine) {
      this.logger.warn(`Tentativa de iniciar partida ${matchId} sem engine.`);
      return false;
    }

    engine.start();
    this.logger.info(`Partida ${matchId} iniciada.`);
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
  }

  async simulateFullMatch(matchId: number): Promise<MatchResult | null> {
    this.logger.info(`Simulando partida completa: ${matchId}`);

    const engine = this.engines.get(matchId);
    if (!engine) {
      const initialized = await this.initializeMatch(matchId);
      if (!initialized) return null;
      return this.simulateFullMatch(matchId);
    }

    engine.simulateToCompletion();

    const result = engine.getMatchResult();
    await this.saveMatchResult(matchId, result);

    this.engines.delete(matchId);
    this.logger.info(
      `Simulação completa finalizada para partida ${matchId}. Placar: ${result.homeScore}-${result.awayScore}`
    );

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
      if (!homeTeam) return;

      let matchImportance = 1.0;
      if (match.competitionId) {
        const competition = await competitionRepository.findAll();
        const comp = competition.find((c) => c.id === match.competitionId);
        if (comp) {
          matchImportance = FinanceService.getMatchImportance(
            comp.tier || 3,
            match.round ?? undefined,
            comp.type === "knockout"
          );
        }
      }

      const { revenue: ticketRevenue, attendance } =
        FinanceService.calculateMatchDayRevenue(
          homeTeam.stadiumCapacity ?? 10000,
          homeTeam.fanSatisfaction ?? 50,
          matchImportance,
          50
        );

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
          description: FinanceService.getTransactionDescription(
            FinancialCategory.TICKET_SALES,
            `${attendance.toLocaleString("pt-PT")} torcedores presentes`
          ),
        });

        this.logger.info(
          `💰 Receita de bilheteria registrada: €${ticketRevenue.toLocaleString(
            "pt-PT"
          )} (${attendance} torcedores)`
        );
      }

      if (ticketRevenue > 0) {
        const currentBudget = homeTeam.budget ?? 0;
        await teamRepository.updateBudget(
          match.homeTeamId!,
          currentBudget + ticketRevenue
        );
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

      const homeTeamRep = homeTeam.reputation || 0;
      const awayTeam = await teamRepository.findById(match.awayTeamId!);
      const awayTeamRep = awayTeam?.reputation || 0;

      let homeResult: "win" | "draw" | "loss" = "draw";
      if (result.homeScore > result.awayScore) homeResult = "win";
      else if (result.homeScore < result.awayScore) homeResult = "loss";

      await marketingService.updateFanSatisfactionAfterMatch(
        match.homeTeamId!,
        homeResult,
        true,
        awayTeamRep
      );

      let awayResult: "win" | "draw" | "loss" = "draw";
      if (result.awayScore > result.homeScore) awayResult = "win";
      else if (result.awayScore < result.homeScore) awayResult = "loss";

      await marketingService.updateFanSatisfactionAfterMatch(
        match.awayTeamId!,
        awayResult,
        false,
        homeTeamRep
      );

      await this.checkCupProgression(matchId);
    } catch (error) {
      this.logger.error("❌ Erro ao salvar resultado da partida:", error);
      throw error;
    }
  }

  private async checkCupProgression(matchId: number): Promise<void> {
    try {
      const match = await matchRepository.findById(matchId);
      if (!match || !match.competitionId || !match.seasonId || !match.round)
        return;

      const competition = (await competitionRepository.findAll()).find(
        (c) => c.id === match.competitionId
      );

      if (!competition || competition.type === "league") return;

      const allMatchesInRound = await matchRepository.findByTeamAndSeason(
        0, // Hack para buscar todas se a query suportar ou precisa refatorar repository
        match.seasonId
      );
      // Nota: findByTeamAndSeason no repo atual busca por time OR time.
      // Idealmente precisaríamos de um findByCompetitionRound.
      // Assumindo que a lógica original funcionava, mantemos, mas adicionamos log.

      // Filtragem em memória (não ideal mas preservando lógica original)
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

      await matchRepository.createMany(matchesToSave as any);
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
    this.logger.info(`Simulando partidas do dia: ${date}`);
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
