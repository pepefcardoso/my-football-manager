import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { ServiceResult } from "../types/ServiceResults";
import { Result } from "../types/ServiceResults";
import type { Team } from "../../domain/models";
import {
  FinancialBalance,
  type LeagueTier,
} from "../../engine/FinancialBalanceConfig";

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

export class EnhancedRevenueService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "EnhancedRevenueService");
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
      async ({ teamId, matchImportance, weatherCondition }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          throw new Error(`Team ${teamId} not found`);
        }

        const leagueTier = this.determineLeagueTier(team);
        const capacity = team.stadiumCapacity || 10000;
        const fanSatisfaction = team.fanSatisfaction || 50;
        const fanBase = team.fanBase || 10000;

        const attendance = this.calculateAttendance(
          capacity,
          fanSatisfaction,
          fanBase,
          matchImportance,
          weatherCondition
        );

        const tickets = this.calculateTicketRevenue(
          attendance,
          capacity,
          leagueTier
        );

        const commercial = this.calculateMatchdayCommercialRevenue(
          attendance,
          team.reputation || 0
        );

        const totalRevenue = tickets.totalRevenue + commercial.totalRevenue;

        this.logger.debug(
          `Matchday revenue for ${team.shortName}: ` +
            `€${totalRevenue.toLocaleString()} (${attendance.toLocaleString()} fans)`
        );

        return {
          tickets,
          commercial,
          totalRevenue,
          revenuePerFan: Math.round(totalRevenue / attendance),
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

  private calculateAttendance(
    capacity: number,
    fanSatisfaction: number,
    fanBase: number,
    matchImportance: number,
    weatherCondition: "good" | "poor"
  ): number {
    const satisfactionFactor = fanSatisfaction / 100;
    const baseAttendance = capacity * satisfactionFactor;

    const importanceAdjusted = baseAttendance * matchImportance;

    const weatherPenalty = weatherCondition === "poor" ? 0.85 : 1.0;
    const weatherAdjusted = importanceAdjusted * weatherPenalty;

    const maxPossible = Math.min(capacity, fanBase * 0.8);

    const randomFactor = 0.9 + Math.random() * 0.2;

    return Math.round(Math.min(maxPossible, weatherAdjusted * randomFactor));
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
    const standardAttendance = attendance - vipAttendance;

    const vipPrice = standardPrice * config.VIP_TICKET_MULTIPLIER;

    const standardRevenue = standardAttendance * standardPrice;
    const vipRevenue = vipAttendance * vipPrice;

    return {
      standardTickets: Math.round(standardRevenue),
      vipTickets: Math.round(vipRevenue),
      totalRevenue: Math.round(standardRevenue + vipRevenue),
      attendance,
      capacity,
      utilizationRate: Math.round((attendance / capacity) * 100),
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
    const capacity = team.stadiumCapacity || 10000;
    const fanSatisfaction = team.fanSatisfaction || 50;
    const fanBase = team.fanBase || 10000;

    const averageAttendance = this.calculateAttendance(
      capacity,
      fanSatisfaction,
      fanBase,
      1.0,
      "good"
    );

    const singleMatchResult = await this.calculateMatchdayRevenue(
      team.id,
      1.0,
      "good"
    );

    const averageMatchRevenue = Result.isSuccess(singleMatchResult)
      ? singleMatchResult.data.totalRevenue
      : 0;

    return {
      homeMatches,
      averageAttendance,
      totalRevenue: Math.round(averageMatchRevenue * homeMatches),
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

    const reputationMultiplier = 1.0 + reputation / 10000;

    const shirtSponsor = Math.round(
      (leagueTier === "TIER_1"
        ? config.SHIRT_SPONSOR_TIER_1
        : leagueTier === "TIER_2"
        ? config.SHIRT_SPONSOR_TIER_2
        : config.SHIRT_SPONSOR_TIER_3) * reputationMultiplier
    );

    const stadiumNaming = Math.round(
      shirtSponsor * config.STADIUM_NAMING_RIGHTS_MULTIPLIER
    );

    const estimatedMerchandiseSales = (team.fanBase || 10000) * 25;
    const kitManufacturer = Math.round(
      estimatedMerchandiseSales * config.KIT_MANUFACTURER_ROYALTY
    );

    const regionalSponsors = Math.round(
      config.REGIONAL_SPONSORS_BASE * reputationMultiplier
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
}
