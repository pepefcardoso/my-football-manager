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
}

export const seasonService = new SeasonService();
