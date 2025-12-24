import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { ServiceResult } from "../../domain/ServiceResults";
import { getBalanceValue } from "../../engine/GameBalanceConfig";
import { CompetitionScheduler } from "../../domain/logic/CompetitionScheduler";

const MATCH_CONFIG = getBalanceValue("MATCH");

export class CupProgressionManager extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "CupProgressionManager");
  }

  async checkAndProgressCup(matchId: number): Promise<ServiceResult<void>> {
    return this.executeVoid("checkAndProgressCup", matchId, async (matchId) => {
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
      lastMatchDate.setDate(
        lastMatchDate.getDate() + MATCH_CONFIG.KNOCKOUT_REST_DAYS
      );
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
    });
  }
}