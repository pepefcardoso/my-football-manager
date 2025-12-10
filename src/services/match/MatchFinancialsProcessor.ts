import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { ServiceResult } from "../types/ServiceResults";
import { FinancialCategory } from "../../domain/enums";

export class MatchFinancialsProcessor extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "MatchFinancialsProcessor");
  }

  async processFinancials(
    match: any,
    homeTeam: any,
    ticketRevenue: number,
    attendance: number
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "processFinancials",
      { match, homeTeam, ticketRevenue, attendance },
      async ({ match, homeTeam, ticketRevenue, attendance }) => {
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
    );
  }
}
