import { staffRepository } from "../repositories/StaffRepository";
import { StaffRole } from "../domain/types";

export interface TeamStaffImpact {
  injuryRecoveryMultiplier: number;
  energyRecoveryBonus: number;
  tacticalAnalysisBonus: number;
  scoutingAccuracy: number;
}

export class StaffService {
  async getStaffImpact(teamId: number): Promise<TeamStaffImpact> {
    const allStaff = await staffRepository.findByTeamId(teamId);

    const medics = allStaff.filter((s) => s.role === StaffRole.MEDICAL_DOCTOR);
    const fitnessCoaches = allStaff.filter(
      (s) => s.role === StaffRole.FITNESS_COACH
    );
    const coaches = allStaff.filter(
      (s) =>
        s.role === StaffRole.HEAD_COACH || s.role === StaffRole.ASSISTANT_COACH
    );
    const scouts = allStaff.filter((s) => s.role === StaffRole.SCOUT);

    return {
      injuryRecoveryMultiplier: this.calculateMedicalImpact(medics),
      energyRecoveryBonus: this.calculateFitnessImpact(fitnessCoaches),
      tacticalAnalysisBonus: this.calculateCoachingImpact(coaches),
      scoutingAccuracy: this.calculateScoutingImpact(scouts),
    };
  }

  private calculateMedicalImpact(medics: any[]): number {
    if (medics.length === 0) return 1.0;

    const maxOverall = Math.max(...medics.map((m) => m.overall));

    const reduction = (maxOverall * 0.4) / 100;
    return 1.0 - reduction;
  }

  private calculateFitnessImpact(coaches: any[]): number {
    if (coaches.length === 0) return 0;

    const avgOverall =
      coaches.reduce((acc, c) => acc + c.overall, 0) / coaches.length;

    return Math.round(avgOverall * 0.1);
  }

  private calculateCoachingImpact(coaches: any[]): number {
    if (coaches.length === 0) return 0;

    let impactScore = 0;
    let count = 0;

    coaches.forEach((c) => {
      const weight = c.role === StaffRole.HEAD_COACH ? 1.0 : 0.5;
      impactScore += c.overall * weight;
      count += weight;
    });

    const weightedAvg = count > 0 ? impactScore / count : 0;

    return Math.round(weightedAvg * 0.2);
  }

  private calculateScoutingImpact(scouts: any[]): number {
    if (scouts.length === 0) return 15;

    const bestScout = Math.max(...scouts.map((s) => s.overall));

    return Math.max(0, 10 - bestScout / 10);
  }
}

export const staffService = new StaffService();
