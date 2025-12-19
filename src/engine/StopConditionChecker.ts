import type { IRepositoryContainer } from "../repositories/IRepositories";
import { TransferStatus } from "../domain/enums";
import { FinancialBalance } from "./FinancialBalanceConfig";

export interface StopCondition {
  shouldStop: boolean;
  reason?: string;
  metadata?: Record<string, any>;
}

export class StopConditionChecker {
  constructor(private repos: IRepositoryContainer) {}

  async checkStopConditions(
    currentDate: string,
    playerTeamId: number | null
  ): Promise<StopCondition> {
    if (playerTeamId) {
      const hasMatch = await this.checkPlayerTeamMatch(
        currentDate,
        playerTeamId
      );
      if (hasMatch.shouldStop) return hasMatch;

      const hasProposals = await this.checkPendingProposals(
        playerTeamId,
        currentDate
      );
      if (hasProposals.shouldStop) return hasProposals;

      const hasCrisis = await this.checkFinancialCrisis(playerTeamId);
      if (hasCrisis.shouldStop) return hasCrisis;
    }

    const isSeasonEnd = await this.checkSeasonEnd(currentDate);
    if (isSeasonEnd.shouldStop) return isSeasonEnd;

    return { shouldStop: false };
  }

  private async checkPlayerTeamMatch(
    date: string,
    teamId: number
  ): Promise<StopCondition> {
    const matches = await this.repos.matches.findPendingMatchesByDate(date);
    const playerMatch = matches.find(
      (m) => m.homeTeamId === teamId || m.awayTeamId === teamId
    );

    if (playerMatch) {
      return {
        shouldStop: true,
        reason: "match_day",
        metadata: { matchId: playerMatch.id },
      };
    }

    return { shouldStop: false };
  }

  private async checkPendingProposals(
    teamId: number,
    currentDate: string
  ): Promise<StopCondition> {
    const proposals = await this.repos.transferProposals.findReceivedByTeam(
      teamId
    );

    const activeAttentionNeeded = proposals.find((p) => {
      const isActive =
        p.status === TransferStatus.PENDING ||
        p.status === TransferStatus.NEGOTIATING;

      if (!isActive) return false;

      const isNew = p.createdAt.startsWith(currentDate);

      const isDeadline = p.responseDeadline.startsWith(currentDate);

      return isNew || isDeadline;
    });

    if (activeAttentionNeeded) {
      return {
        shouldStop: true,
        reason: "transfer_proposal",
        metadata: { proposalId: activeAttentionNeeded.id },
      };
    }

    return { shouldStop: false };
  }

  private async checkFinancialCrisis(teamId: number): Promise<StopCondition> {
    const team = await this.repos.teams.findById(teamId);

    if (team && team.budget < -FinancialBalance.FINANCE.CRITICAL_DEBT) {
      return {
        shouldStop: true,
        reason: "financial_crisis",
        metadata: { budget: team.budget },
      };
    }

    return { shouldStop: false };
  }

  private async checkSeasonEnd(date: string): Promise<StopCondition> {
    const parsedDate = new Date(date);
    const month = parsedDate.getMonth();
    const day = parsedDate.getDate();

    if (month === 11 && day === 15) {
      return {
        shouldStop: true,
        reason: "season_end",
      };
    }

    return { shouldStop: false };
  }
}
