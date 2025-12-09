import { StaffRole } from "../domain/enums";
import type { TeamStaffImpact } from "../domain/types";
import type { Staff } from "../domain/models";
import { Logger } from "../lib/Logger";
import type { IRepositoryContainer } from "../repositories/IRepositories";

/**
 * Configuração de pesos para cálculo de impacto
 */
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

  /**
   * Calcula o impacto agregado de todo o staff do time
   */
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

  /**
   * Organiza staff por categoria funcional
   */
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

  /**
   * Impacto médico: Reduz tempo de recuperação de lesões
   * Quanto maior o overall, mais rápida a recuperação
   *
   * @returns Multiplicador de tempo (1.0 = normal, 0.6 = 40% mais rápido)
   */
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

  /**
   * Impacto de condicionamento físico: Bônus de energia/recuperação
   *
   * @returns Bônus de energia (0-10+)
   */
  private calculateFitnessImpact(coaches: Staff[]): number {
    if (coaches.length === 0) return 0;

    const avgOverall =
      coaches.reduce((acc, c) => acc + c.overall, 0) / coaches.length;

    return Math.round(avgOverall * STAFF_IMPACT_CONFIG.FITNESS.CONVERSION_RATE);
  }

  /**
   * Impacto de treinadores: Bônus tático e de desenvolvimento
   * Head Coach tem peso maior que assistentes
   *
   * @returns Bônus tático (0-20+)
   */
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

  /**
   * Impacto de olheiros: Precisão nas estimativas de atributos
   * Quanto melhor o scout, menor a margem de erro
   *
   * @returns Margem de incerteza (0-15, menor é melhor)
   */
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

  /**
   * Impacto no desenvolvimento de jovens
   *
   * @returns Taxa de desenvolvimento (0-10+)
   */
  private calculateYouthDevelopmentImpact(scouts: Staff[]): number {
    if (scouts.length === 0) return 0;

    const bestScout = Math.max(...scouts.map((s) => s.overall));

    return Math.round(bestScout * STAFF_IMPACT_CONFIG.YOUTH.CONVERSION_RATE);
  }

  /**
   * Retorna impacto padrão quando não há staff ou ocorre erro
   */
  private getDefaultImpact(): TeamStaffImpact {
    return {
      injuryRecoveryMultiplier: 1.0,
      energyRecoveryBonus: 0,
      tacticalAnalysisBonus: 0,
      scoutingAccuracy: STAFF_IMPACT_CONFIG.SCOUTING.BASE_UNCERTAINTY,
      youthDevelopmentRate: 0,
    };
  }
}
