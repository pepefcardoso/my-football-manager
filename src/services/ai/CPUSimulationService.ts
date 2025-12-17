import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { ServiceResult } from "../types/ServiceResults";
import { Result } from "../types/ServiceResults";
import { TrainingFocus } from "../../domain/enums";
import type { DailySimulationService } from "../DailySimulationService";
import type { StaffService } from "../StaffService";
import type { IUnitOfWork } from "../../repositories/IUnitOfWork";
import type { TeamStaffImpact } from "../../domain/types";

export class CPUSimulationService extends BaseService {
  private unitOfWork: IUnitOfWork;

  constructor(
    repositories: IRepositoryContainer,
    unitOfWork: IUnitOfWork,
    private dailySimulation: DailySimulationService,
    private staffService: StaffService
  ) {
    super(repositories, "CPUSimulationService");
    this.unitOfWork = unitOfWork;
  }

  async processAllAITeams(): Promise<ServiceResult<number>> {
    return this.execute("processAllAITeams", null, async () => {
      return await this.unitOfWork.execute(async (txRepos) => {
        const allTeams = await txRepos.teams.findAll();
        const aiTeams = allTeams.filter((t) => !t.isHuman);
        let processedCount = 0;

        for (const team of aiTeams) {
          const focus = TrainingFocus.TECHNICAL; // TODO: Evoluir baseado na estratégia do time

          const staffImpactResult = await this.staffService.getStaffImpact(
            team.id
          );

          const staffImpact = Result.isSuccess(staffImpactResult)
            ? staffImpactResult.data
            : this.getDefaultStaffImpact();

          await this.dailySimulation.processTeamDailyLoop(
            team.id,
            focus,
            staffImpact
          );

          processedCount++;
        }

        return processedCount;
      });
    });
  }

  private getDefaultStaffImpact(): TeamStaffImpact {
    return {
      injuryRecoveryMultiplier: 1.0,
      energyRecoveryBonus: 0,
      tacticalAnalysisBonus: 0,
      scoutingAccuracy: 15,
      youthDevelopmentRate: 0,
    };
  }
}
