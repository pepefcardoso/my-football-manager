import { StaffRole } from "../domain/enums";
import type { TeamStaffImpact } from "../domain/types";
import type { Staff } from "../domain/models";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { BaseService } from "./BaseService";
import type { ServiceResult } from "./types/ServiceResults";

const STAFF_IMPACT_CONFIG = {
  MEDICAL: {
    BASE_MULTIPLIER: 1.0,
    MAX_REDUCTION: 0.4,
  },
  FITNESS: {
    CONVERSION_RATE: 0.1,
  },
  COACHING: {
    HEAD_COACH_WEIGHT: 1.0,
    ASSISTANT_WEIGHT: 0.5,
    CONVERSION_RATE: 0.2,
  },
  SCOUTING: {
    BASE_UNCERTAINTY: 15,
    REDUCTION_RATE: 0.1,
  },
  YOUTH: {
    CONVERSION_RATE: 0.1,
  },
} as const;

export class StaffService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "StaffService");
  }

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

  async getStaffByTeam(teamId: number): Promise<ServiceResult<Staff[]>> {
    return this.execute("getStaffByTeam", teamId, async (teamId) => {
      this.logger.debug(`Buscando staff do time ${teamId}...`);
      return await this.repos.staff.findByTeamId(teamId);
    });
  }

  async getFreeAgents(): Promise<ServiceResult<Staff[]>> {
    return this.execute("getFreeAgents", null, async () => {
      this.logger.debug(`Buscando staff sem contrato...`);
      return await this.repos.staff.findFreeAgents();
    });
  }

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

  async fireStaff(staffId: number): Promise<ServiceResult<void>> {
    return this.executeVoid("fireStaff", staffId, async (staffId) => {
      this.logger.info(`Demitindo staff ${staffId}...`);

      await this.repos.staff.fire(staffId);

      this.logger.info(`Staff ${staffId} demitido com sucesso.`);
    });
  }

  // Métodos privados de cálculo (Lógica Pura)

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
      return STAFF_IMPACT_CONFIG.MEDICAL.BASE_MULTIPLIER;
    }

    const maxOverall = Math.max(...medics.map((m) => m.overall));
    const reduction =
      (maxOverall * STAFF_IMPACT_CONFIG.MEDICAL.MAX_REDUCTION) / 100;

    return Number(
      (STAFF_IMPACT_CONFIG.MEDICAL.BASE_MULTIPLIER - reduction).toFixed(2)
    );
  }

  private calculateFitnessImpact(coaches: Staff[]): number {
    if (coaches.length === 0) return 0;

    const avgOverall =
      coaches.reduce((acc, c) => acc + c.overall, 0) / coaches.length;

    return Math.round(avgOverall * STAFF_IMPACT_CONFIG.FITNESS.CONVERSION_RATE);
  }

  private calculateCoachingImpact(coaches: Staff[]): number {
    if (coaches.length === 0) return 0;

    let impactScore = 0;
    let totalWeight = 0;

    coaches.forEach((c) => {
      const weight =
        c.role === StaffRole.HEAD_COACH
          ? STAFF_IMPACT_CONFIG.COACHING.HEAD_COACH_WEIGHT
          : STAFF_IMPACT_CONFIG.COACHING.ASSISTANT_WEIGHT;

      impactScore += c.overall * weight;
      totalWeight += weight;
    });

    const weightedAvg = totalWeight > 0 ? impactScore / totalWeight : 0;

    return Math.round(
      weightedAvg * STAFF_IMPACT_CONFIG.COACHING.CONVERSION_RATE
    );
  }

  private calculateScoutingImpact(scouts: Staff[]): number {
    if (scouts.length === 0) {
      return STAFF_IMPACT_CONFIG.SCOUTING.BASE_UNCERTAINTY;
    }

    const bestScout = Math.max(...scouts.map((s) => s.overall));
    const reduction = bestScout * STAFF_IMPACT_CONFIG.SCOUTING.REDUCTION_RATE;

    return Math.max(
      0,
      STAFF_IMPACT_CONFIG.SCOUTING.BASE_UNCERTAINTY - reduction
    );
  }

  private calculateYouthDevelopmentImpact(scouts: Staff[]): number {
    if (scouts.length === 0) return 0;

    const bestScout = Math.max(...scouts.map((s) => s.overall));

    return Math.round(bestScout * STAFF_IMPACT_CONFIG.YOUTH.CONVERSION_RATE);
  }
}
