// src/services/SeasonService.ts
import { seasonRepository } from "../repositories/SeasonRepository";
import { competitionRepository } from "../repositories/CompetitionRepository";
import { teamRepository } from "../repositories/TeamRepository";
import { matchRepository } from "../repositories/MatchRepository";
import { CalendarService } from "./CalendarService";
import { Logger } from "../lib/Logger";

export class SeasonService {
  private calendarService: CalendarService;
  private logger: Logger;

  constructor() {
    this.calendarService = new CalendarService();
    this.logger = new Logger("SeasonService");
  }

  /**
   * Inicia uma nova temporada, gerando calendário para todas as competições.
   */
  async startNewSeason(year: number): Promise<boolean> {
    try {
      this.logger.info(`Iniciando temporada ${year}...`);

      const startDate = `${year}-01-15`;
      const endDate = `${year}-12-15`;
      const newSeason = await seasonRepository.create(year, startDate, endDate);

      const competitionsData = await competitionRepository.findAll();

      const competitions = competitionsData.map((c) => ({
        ...c,
        tier: c.tier ?? 1,
        teams: c.teams ?? 20,
        priority: c.priority ?? 1,
        prize: c.prize ?? 0,
        reputation: c.reputation ?? 0,
        config: (c.config as any) || {},
      }));

      const allTeams = await teamRepository.findAll();
      const teamIds = allTeams.map((t) => t.id);

      this.logger.info("Gerando calendário de jogos...");
      const scheduledMatches = await this.calendarService.scheduleSeason(
        competitions,
        teamIds
      );

      const matchesToSave = scheduledMatches.map((match) => ({
        ...match,
        seasonId: newSeason.id,
        homeScore: null,
        awayScore: null,
        isPlayed: false,
        attendance: 0,
        ticketRevenue: 0,
        weather: "sunny",
      }));

      await matchRepository.createMany(matchesToSave);

      this.logger.info(
        `Temporada iniciada com sucesso! ${matchesToSave.length} partidas agendadas.`
      );
      return true;
    } catch (error) {
      this.logger.error("Erro ao iniciar temporada:", error);
      return false;
    }
  }

  async processEndOfSeason(currentSeasonId: number): Promise<void> {
    this.logger.info("Iniciando processamento de fim de temporada...");

    const competitions = await competitionRepository.findAll();

    const tier1 = competitions.find((c) => c.tier === 1 && c.type === "league");
    const tier2 = competitions.find((c) => c.tier === 2 && c.type === "league");

    if (tier1 && tier2) {
      const standingsT1 = await competitionRepository.getStandings(
        tier1.id,
        currentSeasonId
      );
      const standingsT2 = await competitionRepository.getStandings(
        tier2.id,
        currentSeasonId
      );

      const numberToSwap = 4;

      const relegated = standingsT1.slice(-numberToSwap).map((s) => s.teamId);

      const promoted = standingsT2.slice(0, numberToSwap).map((s) => s.teamId);

      this.logger.info(`Rebaixados: ${relegated.join(", ")}`);
      this.logger.info(`Promovidos: ${promoted.join(", ")}`);

      // NOTA: Como não temos tabela de ligação competition_teams explicita no schema atual,
      // a persistência disso dependeria de onde salvamos a "configuração inicial da próxima temporada".
      // Para este exemplo, vamos registrar logs e poderíamos atualizar um campo "tier" no time se existisse,
      // ou preparar a lista para o startNewSeason do próximo ano.

      // TODO: Salvar histórico de trocas ou atualizar metadados dos times
    }
    const activeSeason = await seasonRepository.findActiveSeason();
    if (activeSeason) {
      await this.startNewSeason(activeSeason.year + 1);
    }
  }
}

export const seasonService = new SeasonService();
