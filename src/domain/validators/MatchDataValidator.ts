import type { ITeamRepository } from "../../repositories/IRepositories";
import type { ValidationResult } from "../../services/BaseService";

export class MatchDataValidator {
  static async validateTeams(
    homeTeamId: number,
    awayTeamId: number,
    teamRepo: ITeamRepository
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (homeTeamId === awayTeamId) {
      errors.push("O time da casa e o visitante não podem ser o mesmo.");
    }

    const homeTeam = await teamRepo.findById(homeTeamId);
    if (!homeTeam) {
      errors.push(`Time mandante (ID: ${homeTeamId}) não encontrado.`);
    }

    const awayTeam = await teamRepo.findById(awayTeamId);
    if (!awayTeam) {
      errors.push(`Time visitante (ID: ${awayTeamId}) não encontrado.`);
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  static validateMatchIds(matchId: number): ValidationResult {
    if (!Number.isInteger(matchId) || matchId <= 0) {
      return {
        isValid: false,
        errors: ["ID da partida inválido."],
      };
    }
    return { isValid: true };
  }

  static validateScores(
    homeScore: number,
    awayScore: number
  ): ValidationResult {
    const errors: string[] = [];

    if (homeScore < 0 || awayScore < 0) {
      errors.push("O placar não pode conter valores negativos.");
    }

    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
      errors.push("O placar deve ser composto por números inteiros.");
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
