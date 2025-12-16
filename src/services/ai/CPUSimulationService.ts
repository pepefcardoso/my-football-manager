import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { ServiceResult } from "../types/ServiceResults";
import { Result } from "../types/ServiceResults";
import { TrainingFocus } from "../../domain/enums";
import type { DailySimulationService } from "../DailySimulationService";
import type { StaffService } from "../StaffService";

export class CPUSimulationService extends BaseService {
  constructor(
    repositories: IRepositoryContainer,
    private dailySimulation: DailySimulationService,
    private staffService: StaffService
  ) {
    super(repositories, "CPUSimulationService");
  }

  async processAllAITeams(): Promise<ServiceResult<number>> {
    return this.execute("processAllAITeams", null, async () => {
      const allTeams = await this.repos.teams.findAll();
      const aiTeams = allTeams.filter((t) => !t.isHuman);

      let processedCount = 0;

      for (const team of aiTeams) {
        // TODO: depende da estratégia do time
        const focus = TrainingFocus.TECHNICAL;

        const staffImpactResult = await this.staffService.getStaffImpact(
          team.id
        );

        const staffImpact = Result.isSuccess(staffImpactResult)
          ? staffImpactResult.data
          : {
              injuryRecoveryMultiplier: 1,
              energyRecoveryBonus: 0,
              tacticalAnalysisBonus: 0,
              scoutingAccuracy: 15,
              youthDevelopmentRate: 0,
            };

        await this.dailySimulation.processTeamDailyLoop(
          team.id,
          focus,
          staffImpact
        );

        processedCount++;
      }

      return processedCount;
    });
  }
}
