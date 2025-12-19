import { BaseService } from "./BaseService";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import type { ServiceResult } from "../domain/ServiceResults";
import { Result } from "../domain/ServiceResults";
import type { Team } from "../domain/models";

export interface CompetitiveFacilityComparison {
  teamId: number;
  teamName: string;
  stadiumCapacity: number;
  stadiumQuality: number;
  trainingQuality: number;
  youthQuality: number;
  overallInfrastructureScore: number;
  ranking: number;
}

export interface InfrastructureRankings {
  userTeam: CompetitiveFacilityComparison;
  rivals: CompetitiveFacilityComparison[];
  leagueAverage: {
    stadiumCapacity: number;
    stadiumQuality: number;
    trainingQuality: number;
    youthQuality: number;
    overallScore: number;
  };
  insights: string[];
}

export interface FacilityBenchmark {
  category: "stadium_capacity" | "stadium_quality" | "training" | "youth";
  userValue: number;
  leagueAverage: number;
  leagueBest: number;
  leagueWorst: number;
  percentile: number;
  status: "leading" | "above_average" | "average" | "below_average" | "lagging";
}

export class CompetitiveAnalysisService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "CompetitiveAnalysisService");
  }

  async compareWithLeague(
    teamId: number
  ): Promise<ServiceResult<InfrastructureRankings>> {
    return this.execute("compareWithLeague", teamId, async (teamId) => {
      const allTeams = await this.repos.teams.findAll();

      if (allTeams.length === 0) {
        throw new Error("No teams found in database");
      }

      const userTeam = allTeams.find((t) => t.id === teamId);
      if (!userTeam) {
        throw new Error(`Team ${teamId} not found`);
      }

      const comparisons: CompetitiveFacilityComparison[] = allTeams.map(
        (team) => {
          const overallScore = this.calculateInfrastructureScore(team);

          return {
            teamId: team.id,
            teamName: team.name,
            stadiumCapacity: team.stadiumCapacity || 10000,
            stadiumQuality: team.stadiumQuality || 50,
            trainingQuality: team.trainingCenterQuality || 50,
            youthQuality: team.youthAcademyQuality || 50,
            overallInfrastructureScore: overallScore,
            ranking: 0,
          };
        }
      );

      comparisons.sort(
        (a, b) => b.overallInfrastructureScore - a.overallInfrastructureScore
      );

      comparisons.forEach((comp, index) => {
        comp.ranking = index + 1;
      });

      const userComparison = comparisons.find((c) => c.teamId === teamId)!;

      const leagueAverage = {
        stadiumCapacity: Math.round(
          comparisons.reduce((sum, c) => sum + c.stadiumCapacity, 0) /
            comparisons.length
        ),
        stadiumQuality: Math.round(
          comparisons.reduce((sum, c) => sum + c.stadiumQuality, 0) /
            comparisons.length
        ),
        trainingQuality: Math.round(
          comparisons.reduce((sum, c) => sum + c.trainingQuality, 0) /
            comparisons.length
        ),
        youthQuality: Math.round(
          comparisons.reduce((sum, c) => sum + c.youthQuality, 0) /
            comparisons.length
        ),
        overallScore: Math.round(
          comparisons.reduce(
            (sum, c) => sum + c.overallInfrastructureScore,
            0
          ) / comparisons.length
        ),
      };

      const insights = this.generateCompetitiveInsights(
        userComparison,
        comparisons,
        leagueAverage
      );

      return {
        userTeam: userComparison,
        rivals: comparisons.filter((c) => c.teamId !== teamId),
        leagueAverage,
        insights,
      };
    });
  }

  async getBenchmarks(
    teamId: number
  ): Promise<ServiceResult<FacilityBenchmark[]>> {
    return this.execute("getBenchmarks", teamId, async (teamId) => {
      const allTeams = await this.repos.teams.findAll();
      const userTeam = allTeams.find((t) => t.id === teamId);

      if (!userTeam) {
        throw new Error(`Team ${teamId} not found`);
      }

      const benchmarks: FacilityBenchmark[] = [];

      const capacities = allTeams
        .map((t) => t.stadiumCapacity || 10000)
        .sort((a, b) => a - b);
      benchmarks.push(
        this.createBenchmark(
          "stadium_capacity",
          userTeam.stadiumCapacity || 10000,
          capacities
        )
      );

      const stadiumQualities = allTeams
        .map((t) => t.stadiumQuality || 50)
        .sort((a, b) => a - b);
      benchmarks.push(
        this.createBenchmark(
          "stadium_quality",
          userTeam.stadiumQuality || 50,
          stadiumQualities
        )
      );

      const trainingQualities = allTeams
        .map((t) => t.trainingCenterQuality || 50)
        .sort((a, b) => a - b);
      benchmarks.push(
        this.createBenchmark(
          "training",
          userTeam.trainingCenterQuality || 50,
          trainingQualities
        )
      );

      const youthQualities = allTeams
        .map((t) => t.youthAcademyQuality || 50)
        .sort((a, b) => a - b);
      benchmarks.push(
        this.createBenchmark(
          "youth",
          userTeam.youthAcademyQuality || 50,
          youthQualities
        )
      );

      return benchmarks;
    });
  }

  async getTopRivals(
    teamId: number,
    limit: number = 5
  ): Promise<ServiceResult<CompetitiveFacilityComparison[]>> {
    return this.execute(
      "getTopRivals",
      { teamId, limit },
      async ({ teamId, limit }) => {
        const rankingsResult = await this.compareWithLeague(teamId);

        if (Result.isFailure(rankingsResult)) {
          throw new Error("Failed to get league rankings");
        }

        const rankings = rankingsResult.data;

        return rankings.rivals.slice(0, limit);
      }
    );
  }

  private calculateInfrastructureScore(team: Team): number {
    const stadiumCapacity = team.stadiumCapacity || 10000;
    const stadiumQuality = team.stadiumQuality || 50;
    const trainingQuality = team.trainingCenterQuality || 50;
    const youthQuality = team.youthAcademyQuality || 50;

    const capacityScore = Math.min(100, (stadiumCapacity / 75000) * 100);

    const weights = {
      capacity: 0.3,
      stadiumQuality: 0.25,
      training: 0.25,
      youth: 0.2,
    };

    const score =
      capacityScore * weights.capacity +
      stadiumQuality * weights.stadiumQuality +
      trainingQuality * weights.training +
      youthQuality * weights.youth;

    return Math.round(score);
  }

  private createBenchmark(
    category: FacilityBenchmark["category"],
    userValue: number,
    allValues: number[]
  ): FacilityBenchmark {
    const leagueAverage = Math.round(
      allValues.reduce((sum, v) => sum + v, 0) / allValues.length
    );
    const leagueBest = Math.max(...allValues);
    const leagueWorst = Math.min(...allValues);

    const position = allValues.filter((v) => v <= userValue).length;
    const percentile = Math.round((position / allValues.length) * 100);

    let status: FacilityBenchmark["status"];
    if (percentile >= 90) {
      status = "leading";
    } else if (percentile >= 70) {
      status = "above_average";
    } else if (percentile >= 40) {
      status = "average";
    } else if (percentile >= 20) {
      status = "below_average";
    } else {
      status = "lagging";
    }

    return {
      category,
      userValue,
      leagueAverage,
      leagueBest,
      leagueWorst,
      percentile,
      status,
    };
  }

  private generateCompetitiveInsights(
    userComparison: CompetitiveFacilityComparison,
    allComparisons: CompetitiveFacilityComparison[],
    leagueAverage: InfrastructureRankings["leagueAverage"]
  ): string[] {
    const insights: string[] = [];

    if (userComparison.ranking === 1) {
      insights.push("🏆 Sua infraestrutura é a melhor da liga!");
    } else if (userComparison.ranking <= 3) {
      insights.push(
        `🥉 Você está no Top 3 de infraestrutura (#${userComparison.ranking})`
      );
    } else if (userComparison.ranking <= allComparisons.length / 2) {
      insights.push(
        `📊 Infraestrutura acima da média (${userComparison.ranking}° de ${allComparisons.length})`
      );
    } else {
      insights.push(
        `⚠️ Infraestrutura abaixo da média (${userComparison.ranking}° de ${allComparisons.length})`
      );
    }

    if (userComparison.stadiumCapacity < leagueAverage.stadiumCapacity * 0.7) {
      insights.push(
        "📉 Capacidade do estádio significativamente abaixo da média da liga. Considere expansão."
      );
    } else if (
      userComparison.stadiumCapacity >
      leagueAverage.stadiumCapacity * 1.3
    ) {
      insights.push("📈 Capacidade do estádio acima da média da liga!");
    }

    if (userComparison.stadiumQuality < leagueAverage.stadiumQuality - 10) {
      insights.push(
        "🏟️ Qualidade do estádio abaixo dos rivais. Modernização pode atrair mais torcedores."
      );
    }

    if (userComparison.trainingQuality < leagueAverage.trainingQuality - 10) {
      insights.push(
        "🏋️ Centro de Treinamento inferior aos concorrentes. Invista para reduzir lesões e acelerar desenvolvimento."
      );
    } else if (
      userComparison.trainingQuality >
      leagueAverage.trainingQuality + 15
    ) {
      insights.push(
        "💪 Centro de Treinamento de elite! Vantagem competitiva em condicionamento."
      );
    }

    if (userComparison.youthQuality < leagueAverage.youthQuality - 10) {
      insights.push(
        "🎓 Academia de Base abaixo da média. Seus rivais estão formando talentos melhores."
      );
    } else if (userComparison.youthQuality > leagueAverage.youthQuality + 15) {
      insights.push(
        "🌟 Academia de Base de ponta! Pipeline forte de jovens talentos."
      );
    }

    const leader = allComparisons[0];
    if (userComparison.teamId !== leader.teamId) {
      const gap =
        leader.overallInfrastructureScore -
        userComparison.overallInfrastructureScore;
      insights.push(
        `🎯 Diferença para o líder (${leader.teamName}): ${gap} pontos de infraestrutura`
      );
    }

    return insights;
  }
}
