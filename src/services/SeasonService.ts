import { CalendarService } from "./CalendarService";
import { Logger } from "../lib/Logger";
import type { IRepositoryContainer } from "../repositories/IRepositories";

export interface SeasonSummary {
  seasonYear: number;
  championName: string;
  promotedTeams: number[];
  relegatedTeams: number[];
}

export class SeasonService {
  private calendarService: CalendarService;
  private logger: Logger;
  private repos: IRepositoryContainer;

  constructor(
    repositories: IRepositoryContainer,
    calendarService: CalendarService
  ) {
    this.repos = repositories;
    this.calendarService = calendarService;
    this.logger = new Logger("SeasonService");
  }

  /**
   * Inicia uma nova temporada, gerando calendário para todas as competições.
   */
  async startNewSeason(year: number): Promise<boolean> {
    this.logger.info(`🔄 Iniciando procedimentos para a temporada ${year}...`);

    try {
      const startDate = `${year}-01-15`;
      const endDate = `${year}-12-15`;

      this.logger.debug(
        `Criando registro de temporada: ${startDate} a ${endDate}`
      );
      const newSeason = await this.repos.seasons.create(
        year,
        startDate,
        endDate
      );

      const competitionsData = await this.repos.competitions.findAll();

      const competitions = competitionsData.map((c) => ({
        ...c,
        tier: c.tier ?? 1,
        teams: c.teams ?? 20,
        priority: c.priority ?? 1,
        prize: c.prize ?? 0,
        reputation: c.reputation ?? 0,
        config: (c.config as any) || {},
      }));

      const allTeams = await this.repos.teams.findAll();
      const teamIds = allTeams.map((t) => t.id);

      this.logger.info(
        `Gerando calendário para ${competitions.length} competições e ${teamIds.length} times...`
      );

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

      this.logger.debug(
        `Persistindo ${matchesToSave.length} partidas no banco de dados...`
      );
      await this.repos.matches.createMany(matchesToSave);

      this.logger.info(
        `✅ Temporada ${year} iniciada com sucesso! ${matchesToSave.length} partidas agendadas.`
      );
      return true;
    } catch (error) {
      this.logger.error(
        `❌ Falha crítica ao iniciar temporada ${year}:`,
        error
      );
      return false;
    }
  }

  async processEndOfSeason(
    currentSeasonId: number
  ): Promise<SeasonSummary | null> {
    this.logger.info(
      `🏁 Iniciando processamento de fim de temporada (ID: ${currentSeasonId})...`
    );

    try {
      const competitions = await this.repos.competitions.findAll();
      const activeSeason = await this.repos.seasons.findActiveSeason();

      if (!activeSeason) {
        this.logger.warn("Nenhuma temporada ativa encontrada para finalizar.");
        return null;
      }

      const tier1 = competitions.find(
        (c) => c.tier === 1 && c.type === "league"
      );
      const tier2 = competitions.find(
        (c) => c.tier === 2 && c.type === "league"
      );

      let championName = "Desconhecido";
      let relegated: number[] = [];
      let promoted: number[] = [];

      if (tier1) {
        const standingsT1 = await this.repos.competitions.getStandings(
          tier1.id,
          currentSeasonId
        );

        if (standingsT1.length > 0) {
          championName = standingsT1[0].team?.name || "Desconhecido";

          const numberToSwap = 4;
          relegated = standingsT1.slice(-numberToSwap).map((s) => s.teamId!);
        }
      }

      if (tier2) {
        const standingsT2 = await this.repos.competitions.getStandings(
          tier2.id,
          currentSeasonId
        );
        const numberToSwap = 4;
        promoted = standingsT2.slice(0, numberToSwap).map((s) => s.teamId!);
      }

      this.logger.info(`🏆 Campeão da Temporada: ${championName}`);
      this.logger.info(`🔻 Rebaixados: [${relegated.join(", ")}]`);
      this.logger.info(`🔺 Promovidos: [${promoted.join(", ")}]`);

      await this.startNewSeason(activeSeason.year + 1);

      return {
        seasonYear: activeSeason.year,
        championName,
        promotedTeams: promoted,
        relegatedTeams: relegated,
      };
    } catch (error) {
      this.logger.error("Erro ao processar fim de temporada:", error);
      return null;
    }
  }
}
