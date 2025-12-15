import { BaseService } from "./BaseService";
import { CalendarService } from "./CalendarService";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { Result } from "./types/ServiceResults";
import type { ServiceResult } from "./types/ServiceResults";
import type { SeasonSelect } from "../repositories/SeasonRepository";
import type { Team, CompetitionStanding } from "../domain/models";

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

  /**
   * Inicia uma nova temporada no jogo.
   * Cria o registro da temporada, gera o calendário de partidas para todas as competições
   * e inicializa as tabelas de classificação.
   * @param year - O ano da temporada (ex: 2025).
   * @returns ServiceResult void em caso de sucesso.
   */
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

  /**
   * Obtém a temporada atualmente ativa no jogo.
   * @returns O objeto da temporada (SeasonSelect) ou undefined se nenhuma estiver ativa.
   */
  async getCurrentSeason(): Promise<ServiceResult<SeasonSelect | undefined>> {
    return this.execute("getCurrentSeason", null, async () => {
      return await this.repos.seasons.findActiveSeason();
    });
  }

  /**
   * Retorna o objeto Team do campeão de uma competição específica na temporada.
   * @param seasonId - ID da temporada.
   * @param competitionId - ID da competição.
   * @returns Objeto Team do campeão ou null se não definido.
   */
  async getSeasonChampion(
    seasonId: number,
    competitionId: number
  ): Promise<ServiceResult<Team | null>> {
    return this.execute(
      "getSeasonChampion",
      { seasonId, competitionId },
      async ({ seasonId, competitionId }) => {
        const standings = await this.repos.competitions.getStandings(
          competitionId,
          seasonId
        );

        if (standings.length > 0 && standings[0].team) {
          return standings[0].team as unknown as Team;
        }

        return null;
      }
    );
  }

  /**
   * Lista os artilheiros de uma competição na temporada.
   * @param seasonId - ID da temporada.
   * @param competitionId - ID da competição.
   * @param limit - Número máximo de jogadores a retornar (padrão: 10).
   * @returns Array de estatísticas de jogadores.
   */
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

  /**
   * Retorna as entradas da tabela de classificação correspondentes à zona de rebaixamento.
   * Pega os últimos 'zoneSize' times da tabela ordenada.
   * @param seasonId - ID da temporada.
   * @param competitionId - ID da competição.
   * @param zoneSize - Quantidade de times rebaixados (padrão: 4).
   * @returns Array com as classificações dos times na zona de rebaixamento.
   */
  async getRelegationZone(
    seasonId: number,
    competitionId: number,
    zoneSize: number = 4
  ): Promise<ServiceResult<CompetitionStanding[]>> {
    return this.execute(
      "getRelegationZone",
      { seasonId, competitionId, zoneSize },
      async ({ seasonId, competitionId, zoneSize }) => {
        const standings = await this.repos.competitions.getStandings(
          competitionId,
          seasonId
        );

        const zone = standings.slice(-zoneSize);

        return zone as unknown as CompetitionStanding[];
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
