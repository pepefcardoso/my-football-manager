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
  constructor(
    repositories: IRepositoryContainer,
    unitOfWork: IUnitOfWork, // TODO REMOVER
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
        try {
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
        } catch (err) {
          this.logger.error("Erro ao processar AI Time ID ${team.id}: ", err);
        }
      }

      return processedCount;
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
