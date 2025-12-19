import { BaseService } from "./BaseService";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import type { ServiceResult } from "../domain/ServiceResults";
import type {
  InfrastructureSnapshot,
  InfrastructureEvolutionData,
  TrendAnalysis,
  InfrastructureMilestone,
  ChartDataPoint,
} from "../domain/types/InfrastructureHistoryTypes";

export class InfrastructureHistoryService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "InfrastructureHistoryService");
  }

  async captureMonthlySnapshot(
    teamId: number,
    currentDate: string,
    seasonId: number
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "captureMonthlySnapshot",
      { teamId, currentDate, seasonId },
      async ({ teamId, currentDate, seasonId }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          throw new Error(`Team ${teamId} not found`);
        }

        const stadiumCapacity = team.stadiumCapacity || 10000;
        const fanSatisfaction = team.fanSatisfaction || 50;
        const averageAttendance = Math.round(
          stadiumCapacity * (0.3 + (fanSatisfaction / 100) * 0.7)
        );
        const utilizationRate = averageAttendance / stadiumCapacity;

        // TODO Calcular custo mensal (simplificado - idealmente pegar do InfrastructureService)
        const monthlyMaintenanceCost =
          (stadiumCapacity * 10 + // Stadium
            (team.trainingCenterQuality || 50) * 1000 +
            (team.youthAcademyQuality || 50) * 800) /
          12;

        const snapshot: Partial<InfrastructureSnapshot> = {
          teamId,
          date: currentDate,
          seasonId,
          stadiumCapacity,
          stadiumQuality: team.stadiumQuality || 50,
          trainingQuality: team.trainingCenterQuality || 50,
          youthQuality: team.youthAcademyQuality || 50,
          fanBase: team.fanBase || stadiumCapacity * 2.5,
          monthlyMaintenanceCost,
          averageAttendance,
          utilizationRate,
        };

        // TODO: Insert into infrastructureSnapshots table
        // await this.repos.infrastructureSnapshots.create(snapshot);

        this.logger.debug(
          `📸 Infrastructure snapshot captured for team ${teamId} on ${currentDate}`
        );
      }
    );
  }

  async recordMilestone(
    teamId: number,
    date: string,
    seasonId: number,
    type: "expansion" | "upgrade" | "milestone",
    facilityType: "stadium" | "training" | "youth",
    description: string,
    value: number
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "recordMilestone",
      { teamId, date, seasonId, type, facilityType, description, value },
      async ({
        teamId,
        date,
        seasonId,
        type,
        facilityType,
        description,
        value,
      }) => {
        const milestone: Partial<InfrastructureMilestone> = {
          teamId,
          date,
          seasonId,
          type,
          facilityType,
          description,
          value,
        };

        // TODO: Insert into infrastructureMilestones table
        // await this.repos.infrastructureMilestones.create(milestone);

        this.logger.info(`🎯 Milestone recorded: ${description}`);
      }
    );
  }

  async getEvolutionData(
    teamId: number,
    startDate?: string,
    endDate?: string
  ): Promise<ServiceResult<InfrastructureEvolutionData>> {
    return this.execute(
      "getEvolutionData",
      { teamId, startDate, endDate },
      async ({ teamId, startDate, endDate }) => {
        // TODO: Query snapshots from database with date filters
        // const snapshots = await this.repos.infrastructureSnapshots.findByTeamAndDateRange(
        //   teamId,
        //   startDate,
        //   endDate
        // );

        // MOCK DATA para demonstração
        const snapshots: InfrastructureSnapshot[] =
          this.generateMockSnapshots(teamId);

        const trends = {
          stadiumCapacity: this.analyzeTrend(
            snapshots.map((s) => s.stadiumCapacity)
          ),
          stadiumQuality: this.analyzeTrend(
            snapshots.map((s) => s.stadiumQuality)
          ),
          trainingQuality: this.analyzeTrend(
            snapshots.map((s) => s.trainingQuality)
          ),
          youthQuality: this.analyzeTrend(snapshots.map((s) => s.youthQuality)),
          fanBase: this.analyzeTrend(snapshots.map((s) => s.fanBase)),
          utilizationRate: this.analyzeTrend(
            snapshots.map((s) => Math.round(s.utilizationRate * 100))
          ),
        };

        // TODO: Query milestones
        // const milestones = await this.repos.infrastructureMilestones.findByTeamAndDateRange(
        //   teamId,
        //   startDate,
        //   endDate
        // );

        const milestones: InfrastructureMilestone[] = [];

        return {
          snapshots,
          trends,
          milestones,
        };
      }
    );
  }

  async getChartData(
    teamId: number,
    metric: "capacity" | "quality" | "fanBase" | "utilization",
    startDate?: string,
    endDate?: string
  ): Promise<ServiceResult<ChartDataPoint[]>> {
    return this.execute(
      "getChartData",
      { teamId, metric, startDate, endDate },
      async ({ teamId, metric }) => {
        const evolutionResult = await this.getEvolutionData(
          teamId,
          startDate,
          endDate
        );

        if (evolutionResult.success === false) {
          throw new Error("Failed to get evolution data");
        }

        const snapshots = evolutionResult.data.snapshots;

        let dataPoints: ChartDataPoint[] = [];

        switch (metric) {
          case "capacity":
            dataPoints = snapshots.map((s) => ({
              date: s.date,
              value: s.stadiumCapacity,
            }));
            break;

          case "quality":
            dataPoints = snapshots.map((s) => ({
              date: s.date,
              value: Math.round(
                (s.stadiumQuality + s.trainingQuality + s.youthQuality) / 3
              ),
              label: "Média de Qualidade",
            }));
            break;

          case "fanBase":
            dataPoints = snapshots.map((s) => ({
              date: s.date,
              value: s.fanBase,
            }));
            break;

          case "utilization":
            dataPoints = snapshots.map((s) => ({
              date: s.date,
              value: Math.round(s.utilizationRate * 100),
            }));
            break;
        }

        return dataPoints;
      }
    );
  }

  private analyzeTrend(values: number[]): TrendAnalysis {
    if (values.length === 0) {
      return {
        direction: "stable",
        changePercent: 0,
        startValue: 0,
        endValue: 0,
        averageValue: 0,
      };
    }

    const startValue = values[0];
    const endValue = values[values.length - 1];
    const averageValue = Math.round(
      values.reduce((sum, v) => sum + v, 0) / values.length
    );

    const changePercent =
      startValue !== 0 ? ((endValue - startValue) / startValue) * 100 : 0;

    let direction: TrendAnalysis["direction"];
    if (Math.abs(changePercent) < 2) {
      direction = "stable";
    } else if (changePercent > 0) {
      direction = "increasing";
    } else {
      direction = "decreasing";
    }

    return {
      direction,
      changePercent: Math.round(changePercent * 10) / 10,
      startValue,
      endValue,
      averageValue,
    };
  }

  // TODO: Remover quando o banco estiver populado
  private generateMockSnapshots(teamId: number): InfrastructureSnapshot[] {
    const snapshots: InfrastructureSnapshot[] = [];
    const startDate = new Date("2024-01-01");

    for (let i = 0; i < 12; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);

      snapshots.push({
        id: i + 1,
        teamId,
        date: date.toISOString().split("T")[0],
        seasonId: 1,
        stadiumCapacity: 10000 + i * 100,
        stadiumQuality: 50 + i * 2,
        trainingQuality: 50 + i * 1.5,
        youthQuality: 50 + i * 1.2,
        fanBase: 25000 + i * 500,
        monthlyMaintenanceCost: 50000 + i * 1000,
        averageAttendance: 7000 + i * 100,
        utilizationRate: (7000 + i * 100) / (10000 + i * 100),
      });
    }

    return snapshots;
  }
}
