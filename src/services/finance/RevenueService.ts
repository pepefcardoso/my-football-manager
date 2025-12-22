import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { ServiceResult } from "../../domain/ServiceResults";
import { Result } from "../../domain/ServiceResults";
import type { Team } from "../../domain/models";
import {
  FinancialBalance,
  type LeagueTier,
} from "../../engine/FinancialBalanceConfig";
import { GameBalance } from "../../engine/GameBalanceConfig";
import { RevenueStrategyFactory } from "../../domain/logic/revenue/RevenueStrategyFactory";
import { InfrastructureEconomics } from "../../engine/InfrastructureEconomics";

export interface MatchdayRevenueBreakdown {
  tickets: {
    standardTickets: number;
    vipTickets: number;
    totalRevenue: number;
    attendance: number;
    capacity: number;
    utilizationRate: number;
  };
  commercial: {
    merchandise: number;
    foodBeverage: number;
    parking: number;
    totalRevenue: number;
  };
  totalRevenue: number;
  revenuePerFan: number;
}

export interface AnnualRevenueProjection {
  matchday: {
    homeMatches: number;
    averageAttendance: number;
    totalRevenue: number;
  };
  broadcasting: {
    baseRights: number;
    performanceBonus: number;
    totalRevenue: number;
  };
  commercial: {
    shirtSponsor: number;
    kitManufacturer: number;
    stadiumNaming: number;
    regionalSponsors: number;
    socialMedia: number;
    totalRevenue: number;
  };
  prizeMoney: {
    leaguePosition: number;
    cupCompetitions: number;
    totalRevenue: number;
  };
  grandTotal: number;
  revenuePerPlayer: number;
}

export class RevenueService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "RevenueService");
  }

  /**
   * @param teamId - The home team's ID
   * @param matchImportance - Match importance multiplier (1.0 = normal, 1.5 = derby, 2.0 = cup final)
   * @param weatherCondition - Weather condition affecting attendance
   * @returns Detailed matchday revenue breakdown
   */
  async calculateMatchdayRevenue(
    teamId: number,
    matchImportance: number = 1.0,
    weatherCondition: "good" | "poor" = "good"
  ): Promise<ServiceResult<MatchdayRevenueBreakdown>> {
    return this.execute(
      "calculateMatchdayRevenue",
      { teamId, matchImportance, weatherCondition },
      async ({ teamId, matchImportance }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          throw new Error(`Team ${teamId} not found`);
        }

        const leagueTier = this.determineLeagueTier(team);
        const capacity = team.stadiumCapacity || 10000;
        const fanSatisfaction = team.fanSatisfaction || 50;
        const stadiumQuality = team.stadiumQuality || 20;

        const strategy = RevenueStrategyFactory.getStrategy(undefined);

        const tierNumber = this.mapTierToNumber(leagueTier);

        const stadiumBenefits =
          InfrastructureEconomics.getStadiumQualityBenefits(stadiumQuality);

        const baseTicketPrice = GameBalance.MATCH.REVENUE.BASE_TICKET_PRICE;
        const adjustedTicketPrice =
          baseTicketPrice * (1 + stadiumBenefits.ticketPriceBonus);

        const strategyResult = strategy.calculateRevenue({
          stadiumCapacity: capacity,
          fanSatisfaction: fanSatisfaction,
          ticketPrice: adjustedTicketPrice,
          competitionTier: tierNumber,
          round: 10,
        });

        const baseAttendance = strategyResult.attendance;

        const weatherPenalty = weatherCondition === "poor" ? 0.85 : 1.0;
        const projectedAttendance = Math.round(
          baseAttendance * weatherPenalty * matchImportance
        );

        const finalAttendance = Math.min(capacity, projectedAttendance);

        const tickets = this.calculateTicketRevenue(
          finalAttendance,
          capacity,
          leagueTier
        );

        const commercial = this.calculateMatchdayCommercialRevenue(
          finalAttendance,
          team.reputation || 0
        );

        const totalRevenue = tickets.totalRevenue + commercial.totalRevenue;

        this.logger.debug(
          `Matchday revenue for ${team.shortName}: ` +
            `€${totalRevenue.toLocaleString()} (${finalAttendance.toLocaleString()} fans)`
        );

        return {
          tickets,
          commercial,
          totalRevenue,
          revenuePerFan:
            finalAttendance > 0
              ? Math.round(totalRevenue / finalAttendance)
              : 0,
        };
      }
    );
  }

  /**
   * @param teamId - The team's ID
   * @param leaguePosition - Expected league finishing position
   * @param homeMatches - Number of home matches in season
   * @returns Annual revenue projection
   */
  async projectAnnualRevenue(
    teamId: number,
    leaguePosition: number = 10,
    homeMatches: number = 19
  ): Promise<ServiceResult<AnnualRevenueProjection>> {
    return this.execute(
      "projectAnnualRevenue",
      { teamId, leaguePosition, homeMatches },
      async ({ teamId, leaguePosition, homeMatches }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          throw new Error(`Team ${teamId} not found`);
        }

        const players = await this.repos.players.findByTeamId(teamId);
        const leagueTier = this.determineLeagueTier(team);

        const matchday = await this.calculateAnnualMatchdayRevenue(
          team,
          homeMatches,
          leagueTier
        );

        const broadcasting = this.calculateBroadcastingRevenue(
          leagueTier,
          leaguePosition,
          homeMatches
        );

        const commercial = this.calculateAnnualCommercialRevenue(
          team,
          leagueTier
        );

        const prizeMoney = this.calculatePrizeMoney(leagueTier, leaguePosition);

        const grandTotal =
          matchday.totalRevenue +
          broadcasting.totalRevenue +
          commercial.totalRevenue +
          prizeMoney.totalRevenue;

        this.logger.info(
          `Annual revenue projection for ${team.shortName}: ` +
            `€${grandTotal.toLocaleString()}`
        );

        return {
          matchday,
          broadcasting,
          commercial,
          prizeMoney,
          grandTotal,
          revenuePerPlayer:
            players.length > 0 ? Math.round(grandTotal / players.length) : 0,
        };
      }
    );
  }

  private calculateTicketRevenue(
    attendance: number,
    capacity: number,
    leagueTier: LeagueTier
  ): MatchdayRevenueBreakdown["tickets"] {
    const config = FinancialBalance.REVENUE_STREAMS.MATCHDAY_REVENUE;

    const standardPrice =
      leagueTier === "TIER_1"
        ? config.TIER_1_TICKET_PRICE
        : leagueTier === "TIER_2"
        ? config.TIER_2_TICKET_PRICE
        : config.TIER_3_TICKET_PRICE;

    const vipCapacity = Math.round(capacity * config.VIP_CAPACITY_PERCENTAGE);
    const vipAttendance = Math.min(
      vipCapacity,
      Math.round(attendance * config.VIP_CAPACITY_PERCENTAGE)
    );
    const standardAttendance = Math.max(0, attendance - vipAttendance);

    const vipPrice = standardPrice * config.VIP_TICKET_MULTIPLIER;

    const standardRevenue = standardAttendance * standardPrice;
    const vipRevenue = vipAttendance * vipPrice;

    return {
      standardTickets: Math.round(standardRevenue),
      vipTickets: Math.round(vipRevenue),
      totalRevenue: Math.round(standardRevenue + vipRevenue),
      attendance,
      capacity,
      utilizationRate:
        capacity > 0 ? Math.round((attendance / capacity) * 100) : 0,
    };
  }

  private calculateMatchdayCommercialRevenue(
    attendance: number,
    reputation: number
  ): MatchdayRevenueBreakdown["commercial"] {
    const config = FinancialBalance.REVENUE_STREAMS.MATCHDAY_REVENUE;

    const reputationMultiplier = 1.0 + (reputation / 10000) * 0.5;

    const merchandise = Math.round(
      attendance * config.MERCHANDISE_PER_FAN * reputationMultiplier
    );

    const foodBeverage = Math.round(attendance * config.FOOD_BEVERAGE_PER_FAN);

    const parkingAttendees = Math.round(
      attendance * config.PARKING_REVENUE_PERCENTAGE
    );
    const parking = parkingAttendees * config.PARKING_FEE;

    return {
      merchandise,
      foodBeverage,
      parking,
      totalRevenue: merchandise + foodBeverage + parking,
    };
  }

  private async calculateAnnualMatchdayRevenue(
    team: Team,
    homeMatches: number,
    leagueTier: LeagueTier
  ): Promise<AnnualRevenueProjection["matchday"]> {
    const singleMatchResult = await this.calculateMatchdayRevenue(
      team.id,
      1.0,
      "good"
    );

    const averageRevenue = Result.isSuccess(singleMatchResult)
      ? singleMatchResult.data.totalRevenue
      : 0;

    const averageAttendance = Result.isSuccess(singleMatchResult)
      ? singleMatchResult.data.tickets.attendance
      : 0;

    return {
      homeMatches,
      averageAttendance,
      totalRevenue: Math.round(averageRevenue * homeMatches),
    };
  }

  private calculateBroadcastingRevenue(
    leagueTier: LeagueTier,
    leaguePosition: number,
    homeMatches: number
  ): AnnualRevenueProjection["broadcasting"] {
    const config = FinancialBalance.REVENUE_STREAMS.BROADCASTING;

    const baseRights =
      leagueTier === "TIER_1"
        ? config.TIER_1_ANNUAL_BASE
        : leagueTier === "TIER_2"
        ? config.TIER_2_ANNUAL_BASE
        : config.TIER_3_ANNUAL_BASE;

    const estimatedWins = Math.round(homeMatches * 0.5);
    const performanceBonus = estimatedWins * config.PERFORMANCE_BONUS_PER_WIN;

    return {
      baseRights,
      performanceBonus,
      totalRevenue: Math.round(baseRights + performanceBonus),
    };
  }

  private calculateAnnualCommercialRevenue(
    team: Team,
    leagueTier: LeagueTier
  ): AnnualRevenueProjection["commercial"] {
    const config = FinancialBalance.REVENUE_STREAMS.COMMERCIAL;
    const reputation = team.reputation || 0;

    const adminLevel = team.administrativeCenterQuality || 0;
    const adminBenefits = InfrastructureEconomics.getAdminBenefits(adminLevel);

    const reputationMultiplier = 1.0 + reputation / 10000;

    const finalMultiplier =
      reputationMultiplier * (1 + adminBenefits.sponsorshipBonus);

    const shirtSponsor = Math.round(
      (leagueTier === "TIER_1"
        ? config.SHIRT_SPONSOR_TIER_1
        : leagueTier === "TIER_2"
        ? config.SHIRT_SPONSOR_TIER_2
        : config.SHIRT_SPONSOR_TIER_3) * finalMultiplier
    );

    const stadiumNaming = Math.round(
      shirtSponsor * config.STADIUM_NAMING_RIGHTS_MULTIPLIER
    );

    const merchandisingMultiplier = 1.0 + adminBenefits.sponsorshipBonus * 0.2;

    const estimatedMerchandiseSales = (team.fanBase || 10000) * 25;
    const kitManufacturer = Math.round(
      estimatedMerchandiseSales *
        config.KIT_MANUFACTURER_ROYALTY *
        merchandisingMultiplier
    );

    const regionalSponsors = Math.round(
      config.REGIONAL_SPONSORS_BASE * finalMultiplier
    );

    const estimatedFollowers = (team.fanBase || 10000) * 2;
    const socialMedia = Math.round(
      (estimatedFollowers / 10000) *
        config.SOCIAL_MEDIA_REVENUE_PER_10K_FOLLOWERS
    );

    return {
      shirtSponsor,
      kitManufacturer,
      stadiumNaming,
      regionalSponsors,
      socialMedia,
      totalRevenue:
        shirtSponsor +
        kitManufacturer +
        stadiumNaming +
        regionalSponsors +
        socialMedia,
    };
  }

  private calculatePrizeMoney(
    leagueTier: LeagueTier,
    leaguePosition: number
  ): AnnualRevenueProjection["prizeMoney"] {
    const config = FinancialBalance.REVENUE_STREAMS.PRIZE_MONEY;

    const baseWinnerPrize =
      leagueTier === "TIER_1"
        ? config.LEAGUE_WINNER_TIER_1
        : leagueTier === "TIER_2"
        ? config.LEAGUE_WINNER_TIER_2
        : 0;

    const positionPrize =
      leaguePosition === 1
        ? baseWinnerPrize
        : Math.max(
            0,
            baseWinnerPrize - (leaguePosition - 1) * config.PER_POSITION_BONUS
          );

    const cupRevenue = Math.random() > 0.7 ? config.CUP_WINNER : 0;

    return {
      leaguePosition: Math.round(positionPrize),
      cupCompetitions: cupRevenue,
      totalRevenue: Math.round(positionPrize + cupRevenue),
    };
  }

  private determineLeagueTier(team: Team): LeagueTier {
    const reputation = team.reputation || 0;

    if (reputation >= 7000) return "TIER_1";
    if (reputation >= 4000) return "TIER_2";
    return "TIER_3";
  }

  private mapTierToNumber(tier: LeagueTier): number {
    if (tier === "TIER_1") return 1;
    if (tier === "TIER_2") return 2;
    return 3;
  }
}
