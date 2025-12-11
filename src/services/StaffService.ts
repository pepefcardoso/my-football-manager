import { StaffRole } from "../domain/enums";
import type { TeamStaffImpact } from "../domain/types";
import type { Staff } from "../domain/models";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { BaseService } from "./BaseService";
import type { ServiceResult } from "./types/ServiceResults";
import { getBalanceValue } from "../engine/GameBalanceConfig";

const STAFF_CONFIG = getBalanceValue("STAFF");
const SCOUTING_CONFIG = getBalanceValue("SCOUTING");

export class StaffService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "StaffService");
  }

  /**
   *
   * @param teamId
   * @returns
   */
  async getStaffImpact(
    teamId: number
  ): Promise<ServiceResult<TeamStaffImpact>> {
    return this.execute("getStaffImpact", teamId, async (teamId) => {
      this.logger.debug(
        `Calculando impacto da equipe técnica para o time ${teamId}...`
      );

      const allStaff = await this.repos.staff.findByTeamId(teamId);
      const categorized = this.categorizeStaff(allStaff);

      const impact: TeamStaffImpact = {
        injuryRecoveryMultiplier: this.calculateMedicalImpact(
          categorized.medical
        ),
        energyRecoveryBonus: this.calculateFitnessImpact(categorized.fitness),
        tacticalAnalysisBonus: this.calculateCoachingImpact(
          categorized.coaches
        ),
        scoutingAccuracy: this.calculateScoutingImpact(categorized.scouts),
        youthDevelopmentRate: this.calculateYouthDevelopmentImpact(
          categorized.scouts
        ),
      };

      this.logger.debug("Bônus calculados:", impact);

      return impact;
    });
  }

  /**
   *
   * @param teamId
   * @returns
   */
  async getStaffByTeam(teamId: number): Promise<ServiceResult<Staff[]>> {
    return this.execute("getStaffByTeam", teamId, async (teamId) => {
      this.logger.debug(`Buscando staff do time ${teamId}...`);
      return await this.repos.staff.findByTeamId(teamId);
    });
  }

  /**
   *
   * @returns
   */
  async getFreeAgents(): Promise<ServiceResult<Staff[]>> {
    return this.execute("getFreeAgents", null, async () => {
      this.logger.debug(`Buscando staff sem contrato...`);
      return await this.repos.staff.findFreeAgents();
    });
  }

  /**
   *
   * @param teamId
   * @param staffId
   * @param salary
   * @param contractEnd
   * @returns
   */
  async hireStaff(
    teamId: number,
    staffId: number,
    salary: number,
    contractEnd: string
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "hireStaff",
      { teamId, staffId, salary, contractEnd },
      async ({ teamId, staffId, salary, contractEnd }) => {
        this.logger.info(
          `Contratando staff ${staffId} para o time ${teamId}...`
        );

        await this.repos.staff.update(staffId, {
          teamId,
          salary,
          contractEnd,
        });

        this.logger.info(`Staff ${staffId} contratado com sucesso.`);
      }
    );
  }

  /**
   *
   * @param staffId
   * @returns
   */
  async fireStaff(staffId: number): Promise<ServiceResult<void>> {
    return this.executeVoid("fireStaff", staffId, async (staffId) => {
      this.logger.info(`Demitindo staff ${staffId}...`);

      await this.repos.staff.fire(staffId);

      this.logger.info(`Staff ${staffId} demitido com sucesso.`);
    });
  }

  private categorizeStaff(allStaff: Staff[]): {
    medical: Staff[];
    fitness: Staff[];
    coaches: Staff[];
    scouts: Staff[];
  } {
    return {
      medical: allStaff.filter((s) => s.role === StaffRole.MEDICAL_DOCTOR),
      fitness: allStaff.filter((s) => s.role === StaffRole.FITNESS_COACH),
      coaches: allStaff.filter(
        (s) =>
          s.role === StaffRole.HEAD_COACH ||
          s.role === StaffRole.ASSISTANT_COACH
      ),
      scouts: allStaff.filter((s) => s.role === StaffRole.SCOUT),
    };
  }

  private calculateMedicalImpact(medics: Staff[]): number {
    if (medics.length === 0) {
      return 1.0;
    }

    const maxOverall = Math.max(...medics.map((m) => m.overall));
    const reduction = (maxOverall * STAFF_CONFIG.MEDICAL_MAX_REDUCTION) / 100;

    return Number((1.0 - reduction).toFixed(2));
  }

  private calculateFitnessImpact(coaches: Staff[]): number {
    if (coaches.length === 0) return 0;

    const avgOverall =
      coaches.reduce((acc, c) => acc + c.overall, 0) / coaches.length;

    return Math.round(avgOverall * STAFF_CONFIG.FITNESS_ENERGY_RATE);
  }

  private calculateCoachingImpact(coaches: Staff[]): number {
    if (coaches.length === 0) return 0;

    let impactScore = 0;
    let totalWeight = 0;

    coaches.forEach((c) => {
      const weight =
        c.role === StaffRole.HEAD_COACH
          ? 1.0
          : STAFF_CONFIG.ASSISTANT_COACH_WEIGHT;

      impactScore += c.overall * weight;
      totalWeight += weight;
    });

    const weightedAvg = totalWeight > 0 ? impactScore / totalWeight : 0;

    return Math.round(weightedAvg * STAFF_CONFIG.COACHING_CONVERSION_RATE);
  }

  private calculateScoutingImpact(scouts: Staff[]): number {
    if (scouts.length === 0) {
      return SCOUTING_CONFIG.BASE_UNCERTAINTY;
    }

    const bestScout = Math.max(...scouts.map((s) => s.overall));
    const reduction = bestScout * SCOUTING_CONFIG.REDUCTION_RATE;

    return Math.max(0, SCOUTING_CONFIG.BASE_UNCERTAINTY - reduction);
  }

  private calculateYouthDevelopmentImpact(scouts: Staff[]): number {
    if (scouts.length === 0) return 0;

    const bestScout = Math.max(...scouts.map((s) => s.overall));

    return Math.round(bestScout * STAFF_CONFIG.YOUTH_DEVELOPMENT_RATE);
  }
}
