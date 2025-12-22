import { BaseService } from "./BaseService";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import type { ServiceResult } from "../domain/ServiceResults";
import { InfrastructureEconomics } from "../engine/InfrastructureEconomics";

export interface DepreciableAsset {
  id: number;
  teamId: number;
  assetType: "stadium_expansion" | "stadium_quality" | "training" | "youth";
  purchaseDate: string;
  originalCost: number;
  usefulLifeYears: number;
  currentBookValue: number;
  accumulatedDepreciation: number;
  annualDepreciation: number;
  fullyDepreciated: boolean;
}

export interface FFPDepreciationReport {
  teamId: number;
  seasonId: number;
  assets: DepreciableAsset[];
  totalBookValue: number;
  totalAnnualDepreciation: number;
  ffpAdjustedExpenses: number;
  complianceStatus: {
    compliant: boolean;
    violations: string[];
    investmentCap: number;
    currentInvestment: number;
  };
}

export interface InvestmentAllowance {
  teamId: number;
  annualRevenue: number;
  maxInfrastructureSpend: number;
  currentYearSpend: number;
  remainingAllowance: number;
  canInvest: boolean;
}

export class FFPDepreciationService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "FFPDepreciationService");
  }

  async registerAsset(
    teamId: number,
    assetType: DepreciableAsset["assetType"],
    purchaseDate: string,
    cost: number
  ): Promise<ServiceResult<DepreciableAsset>> {
    return this.execute(
      "registerAsset",
      { teamId, assetType, purchaseDate, cost },
      async ({ teamId, assetType, purchaseDate, cost }) => {
        const usefulLifeYears = InfrastructureEconomics.FFP.DEPRECIATION_YEARS;
        const annualDepreciation = Math.round(cost / usefulLifeYears);

        const asset: DepreciableAsset = {
          id: Date.now(), // TODO: Use proper DB ID
          teamId,
          assetType,
          purchaseDate,
          originalCost: cost,
          usefulLifeYears,
          currentBookValue: cost,
          accumulatedDepreciation: 0,
          annualDepreciation,
          fullyDepreciated: false,
        };

        // TODO: Save to database
        // await this.repos.depreciableAssets.create(asset);

        this.logger.info(
          `📋 Asset registered: ${assetType} for €${cost.toLocaleString()} ` +
            `(Depreciation: €${annualDepreciation.toLocaleString()}/year)`
        );

        return asset;
      }
    );
  }

  async processAnnualDepreciation(
    teamId: number,
    currentDate: string
  ): Promise<ServiceResult<number>> {
    return this.execute(
      "processAnnualDepreciation",
      { teamId, currentDate },
      async ({ teamId, currentDate }) => {
        // TODO: Query all active assets for team
        // const assets = await this.repos.depreciableAssets.findByTeam(teamId);

        this.logger.debug(
          `Processing annual depreciation for team ${teamId} on ${currentDate}`
        );

        // MOCK: Empty array for now
        const assets: DepreciableAsset[] = [];

        let totalDepreciation = 0;

        for (const asset of assets) {
          if (asset.fullyDepreciated) continue;

          const newAccumulatedDepreciation =
            asset.accumulatedDepreciation + asset.annualDepreciation;

          const newBookValue = Math.max(
            0,
            asset.originalCost - newAccumulatedDepreciation
          );

          const fullyDepreciated = newBookValue === 0;

          // TODO: Update asset in database
          // await this.repos.depreciableAssets.update(asset.id, {
          //   accumulatedDepreciation: newAccumulatedDepreciation,
          //   currentBookValue: newBookValue,
          //   fullyDepreciated,
          // });

          totalDepreciation += asset.annualDepreciation;

          if (fullyDepreciated) {
            this.logger.info(`✅ Asset fully depreciated: ${asset.assetType}`);
          }
        }

        this.logger.info(
          `💰 Annual depreciation processed for team ${teamId}: ` +
            `€${totalDepreciation.toLocaleString()}`
        );

        return totalDepreciation;
      }
    );
  }

  async getFFPDepreciationReport(
    teamId: number,
    seasonId: number
  ): Promise<ServiceResult<FFPDepreciationReport>> {
    return this.execute(
      "getFFPDepreciationReport",
      { teamId, seasonId },
      async ({ teamId, seasonId }) => {
        // TODO: Query assets
        // const assets = await this.repos.depreciableAssets.findByTeam(teamId);
        const assets: DepreciableAsset[] = [];

        const totalBookValue = assets.reduce(
          (sum, a) => sum + a.currentBookValue,
          0
        );
        const totalAnnualDepreciation = assets.reduce(
          (sum, a) => sum + a.annualDepreciation,
          0
        );

        const records = await this.repos.financial.findByTeamAndSeason(
          teamId,
          seasonId
        );

        const infrastructureExpenses = records
          .filter(
            (r) => r.category === "infrastructure" && r.type === "expense"
          )
          .reduce((sum, r) => sum + r.amount, 0);

        const ffpAdjustedExpenses =
          infrastructureExpenses - totalAnnualDepreciation;

        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          throw new Error(`Team ${teamId} not found`);
        }

        const investmentCap =
          (team.budget || 0) *
          InfrastructureEconomics.FFP.MAX_INFRASTRUCTURE_SPEND_PERCENTAGE;

        const currentInvestment = infrastructureExpenses;
        const violations: string[] = [];

        if (currentInvestment > investmentCap) {
          violations.push(
            `Infrastructure spending (€${currentInvestment.toLocaleString()}) ` +
              `exceeds FFP limit of €${investmentCap.toLocaleString()} ` +
              `(${
                InfrastructureEconomics.FFP
                  .MAX_INFRASTRUCTURE_SPEND_PERCENTAGE * 100
              }% of revenue)`
          );
        }

        const compliant = violations.length === 0;

        return {
          teamId,
          seasonId,
          assets,
          totalBookValue,
          totalAnnualDepreciation,
          ffpAdjustedExpenses,
          complianceStatus: {
            compliant,
            violations,
            investmentCap,
            currentInvestment,
          },
        };
      }
    );
  }

  async getInvestmentAllowance(
    teamId: number,
    seasonId: number
  ): Promise<ServiceResult<InvestmentAllowance>> {
    return this.execute(
      "getInvestmentAllowance",
      { teamId, seasonId },
      async ({ teamId, seasonId }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          throw new Error(`Team ${teamId} not found`);
        }

        // Estimate annual revenue (simplified)
        // TODO: Use actual projected revenue from RevenueService
        const annualRevenue = (team.budget || 0) * 2;

        const maxInfrastructureSpend = Math.round(
          annualRevenue *
            InfrastructureEconomics.FFP.MAX_INFRASTRUCTURE_SPEND_PERCENTAGE
        );

        const records = await this.repos.financial.findByTeamAndSeason(
          teamId,
          seasonId
        );

        const currentYearSpend = records
          .filter(
            (r) => r.category === "infrastructure" && r.type === "expense"
          )
          .reduce((sum, r) => sum + r.amount, 0);

        const remainingAllowance = Math.max(
          0,
          maxInfrastructureSpend - currentYearSpend
        );
        const canInvest = remainingAllowance > 0;

        return {
          teamId,
          annualRevenue,
          maxInfrastructureSpend,
          currentYearSpend,
          remainingAllowance,
          canInvest,
        };
      }
    );
  }

  async analyzeInvestmentImpact(
    teamId: number,
    seasonId: number,
    proposedCost: number
  ): Promise<
    ServiceResult<{
      allowed: boolean;
      reason?: string;
      annualDepreciation: number;
      ffpImpactYear1: number;
      ffpImpactLongTerm: number;
      remainingAllowanceAfter: number;
    }>
  > {
    return this.execute(
      "analyzeInvestmentImpact",
      { teamId, seasonId, proposedCost },
      async ({ teamId, seasonId, proposedCost }) => {
        const allowanceResult = await this.getInvestmentAllowance(
          teamId,
          seasonId
        );

        if (!allowanceResult.success) {
          throw new Error("Failed to get investment allowance");
        }

        const allowance = allowanceResult.data;

        const usefulLife = InfrastructureEconomics.FFP.DEPRECIATION_YEARS;
        const annualDepreciation = Math.round(proposedCost / usefulLife);

        const ffpImpactYear1 = proposedCost - annualDepreciation;

        const ffpImpactLongTerm = annualDepreciation;

        const allowed = proposedCost <= allowance.remainingAllowance;
        const remainingAllowanceAfter = Math.max(
          0,
          allowance.remainingAllowance - proposedCost
        );

        let reason: string | undefined;
        if (!allowed) {
          reason =
            `Investment of €${proposedCost.toLocaleString()} exceeds ` +
            `remaining FFP allowance of €${allowance.remainingAllowance.toLocaleString()}`;
        }

        this.logger.info(
          `📊 Investment Analysis: €${proposedCost.toLocaleString()} | ` +
            `Annual Depreciation: €${annualDepreciation.toLocaleString()} | ` +
            `Allowed: ${allowed}`
        );

        return {
          allowed,
          reason,
          annualDepreciation,
          ffpImpactYear1,
          ffpImpactLongTerm,
          remainingAllowanceAfter,
        };
      }
    );
  }

  async getInfrastructureValuation(teamId: number): Promise<
    ServiceResult<{
      bookValue: number;
      marketValue: number;
      appreciationFactor: number;
    }>
  > {
    return this.execute(
      "getInfrastructureValuation",
      teamId,
      async (teamId) => {
        // TODO: Query assets
        // const assets = await this.repos.depreciableAssets.findByTeam(teamId);
        this.logger.debug(`Calculating valuation for team ${teamId}`);

        const assets: DepreciableAsset[] = [];

        const bookValue = assets.reduce(
          (sum, a) => sum + a.currentBookValue,
          0
        );

        // Market value: Assets appreciate with inflation and utility
        // Assumption: Well-maintained infrastructure appreciates ~3% annually
        const appreciationFactor = 1.03;
        const marketValue = Math.round(bookValue * appreciationFactor);

        return {
          bookValue,
          marketValue,
          appreciationFactor,
        };
      }
    );
  }
}
