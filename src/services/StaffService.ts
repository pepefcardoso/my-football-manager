import { StaffRole } from "../domain/enums";
import type { TeamStaffImpact } from "../domain/types";
import type { Staff } from "../domain/models";
import { Logger } from "../lib/Logger";
import type { IRepositoryContainer } from "../repositories/IRepositories";

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

export class StaffService {
  private readonly logger: Logger;
  private readonly repos: IRepositoryContainer;

  constructor(repositories: IRepositoryContainer) {
    this.repos = repositories;
    this.logger = new Logger("StaffService");
  }

  async getStaffImpact(teamId: number): Promise<TeamStaffImpact> {
    this.logger.debug(
      `Calculando impacto da equipe técnica para o time ${teamId}...`
    );

    try {
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
    } catch (error) {
      this.logger.error(
        `Erro ao calcular impacto do staff para time ${teamId}:`,
        error
      );

      return this.getDefaultImpact();
    }
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

  private getDefaultImpact(): TeamStaffImpact {
    return {
      injuryRecoveryMultiplier: 1.0,
      energyRecoveryBonus: 0,
      tacticalAnalysisBonus: 0,
      scoutingAccuracy: STAFF_IMPACT_CONFIG.SCOUTING.BASE_UNCERTAINTY,
      youthDevelopmentRate: 0,
    };
  }

  async getStaffByTeam(teamId: number) {
    this.logger.debug(`Buscando staff do time ${teamId}...`);

    try {
      return await this.repos.staff.findByTeamId(teamId);
    } catch (error) {
      this.logger.error(`Erro ao buscar staff do time ${teamId}:`, error);
      return [];
    }
  }

  async getFreeAgents() {
    this.logger.debug(`Buscando staff sem contrato...`);

    try {
      return await this.repos.staff.findFreeAgents();
    } catch (error) {
      this.logger.error("Erro ao buscar staff sem contrato:", error);
      return [];
    }
  }

  async hireStaff(
    teamId: number,
    staffId: number,
    salary: number,
    contractEnd: string
  ): Promise<boolean> {
    this.logger.info(`Contratando staff ${staffId} para o time ${teamId}...`);

    try {
      await this.repos.staff.update(staffId, {
        teamId,
        salary,
        contractEnd,
      });

      this.logger.info(`Staff ${staffId} contratado com sucesso.`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao contratar staff ${staffId}:`, error);
      return false;
    }
  }

  async fireStaff(staffId: number): Promise<boolean> {
    this.logger.info(`Demitindo staff ${staffId}...`);

    try {
      await this.repos.staff.fire(staffId);
      this.logger.info(`Staff ${staffId} demitido com sucesso.`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao demitir staff ${staffId}:`, error);
      return false;
    }
  }
}
