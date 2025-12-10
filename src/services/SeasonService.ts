import { BaseService } from "./BaseService";
import { CalendarService } from "./CalendarService";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { Result } from "./types/ServiceResults";
import type { ServiceResult } from "./types/ServiceResults";
import type { SeasonSelect } from "../repositories/SeasonRepository";

export interface SeasonSummary {
  seasonYear: number;
  championName: string;
  promotedTeams: number[];
  relegatedTeams: number[];
}

export class SeasonService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "SeasonService");
  }

  async startNewSeason(year: number): Promise<ServiceResult<void>> {
    return this.executeVoid("startNewSeason", year, async (year) => {
      this.logger.info(
        `🔄 Iniciando procedimentos para a temporada ${year}...`
      );

      const startDate = `${year}-01-15`;
      const endDate = `${year}-12-15`;

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

      const calendarService = new CalendarService(this.repos);
      const scheduledMatchesResult = await calendarService.scheduleSeason(
        competitions,
        teamIds
      );

      if (Result.isFailure(scheduledMatchesResult)) {
        throw new Error(
          `Falha ao agendar temporada: ${scheduledMatchesResult.error.message}`
        );
      }

      const scheduledMatches = scheduledMatchesResult.data;

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
      await this.repos.matches.createMany(matchesToSave as any);

      await this.initializeStandings(newSeason.id, competitions, allTeams);

      this.logger.info(
        `✅ Temporada ${year} iniciada com sucesso! ${matchesToSave.length} partidas agendadas.`
      );
    });
  }

  async processEndOfSeason(
    currentSeasonId: number
  ): Promise<ServiceResult<SeasonSummary>> {
    return this.execute(
      "processEndOfSeason",
      currentSeasonId,
      async (currentSeasonId) => {
        this.logger.info(
          `🏁 Iniciando processamento de fim de temporada (ID: ${currentSeasonId})...`
        );

        const competitions = await this.repos.competitions.findAll();
        const activeSeason = await this.repos.seasons.findActiveSeason();

        if (!activeSeason) {
          throw new Error("Nenhuma temporada ativa encontrada para finalizar.");
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

        const nextSeasonResult = await this.startNewSeason(
          activeSeason.year + 1
        );

        if (Result.isFailure(nextSeasonResult)) {
          throw new Error(
            `Erro ao iniciar próxima temporada: ${nextSeasonResult.error.message}`
          );
        }

        return {
          seasonYear: activeSeason.year,
          championName,
          promotedTeams: promoted,
          relegatedTeams: relegated,
        };
      }
    );
  }

  async getCurrentSeason(): Promise<ServiceResult<SeasonSelect | undefined>> {
    return this.execute("getCurrentSeason", null, async () => {
      return await this.repos.seasons.findActiveSeason();
    });
  }

  async getSeasonChampion(
    seasonId: number,
    competitionId: number
  ): Promise<ServiceResult<string | null>> {
    return this.execute(
      "getSeasonChampion",
      { seasonId, competitionId },
      async ({ seasonId, competitionId }) => {
        const standings = await this.repos.competitions.getStandings(
          competitionId,
          seasonId
        );

        if (standings.length > 0 && standings[0].team) {
          return standings[0].team.name;
        }

        return null;
      }
    );
  }

  async getTopScorers(
    seasonId: number,
    competitionId: number,
    limit: number = 10
  ): Promise<ServiceResult<any[]>> {
    return this.execute(
      "getTopScorers",
      { seasonId, competitionId, limit },
      async ({ seasonId, competitionId, limit }) => {
        return await this.repos.competitions.getTopScorers(
          competitionId,
          seasonId,
          limit
        );
      }
    );
  }

  async getRelegationZone(
    seasonId: number,
    competitionId: number,
    zoneSize: number = 4
  ): Promise<ServiceResult<any[]>> {
    return this.execute(
      "getRelegationZone",
      { seasonId, competitionId, zoneSize },
      async ({ seasonId, competitionId, zoneSize }) => {
        const standings = await this.repos.competitions.getStandings(
          competitionId,
          seasonId
        );

        return standings.slice(-zoneSize);
      }
    );
  }

  private async initializeStandings(
    seasonId: number,
    competitions: any[],
    teams: any[]
  ): Promise<void> {
    this.logger.debug(`Inicializando tabelas de classificação...`);

    for (const competition of competitions) {
      if (competition.type === "league") {
        const participatingTeams = teams.slice(0, competition.teams);

        for (const team of participatingTeams) {
          await this.repos.competitions.updateStanding(
            competition.id,
            seasonId,
            team.id,
            {
              played: 0,
              wins: 0,
              draws: 0,
              losses: 0,
              goalsFor: 0,
              goalsAgainst: 0,
              points: 0,
            }
          );
        }
      }
    }
  }
}
