import { playerRepository } from "../data/repositories/PlayerRepository";
import { staffRepository } from "../data/repositories/StaffRepository";
import { financialRepository } from "../data/repositories/FinancialRepository";
import { FinancialCategory } from "../domain/types";

export class ContractService {
  async checkExpiringContracts(currentDate: string): Promise<{
    playersReleased: number;
    staffReleased: number;
  }> {
    // Implementar lógica para verificar contratos expirando na data atual

    return { playersReleased: 0, staffReleased: 0 };
  }

  async calculateDailyWageBill(teamId: number): Promise<number> {
    const players = await playerRepository.findByTeamId(teamId);
    const staff = await staffRepository.findByTeamId(teamId);

    const playerWages = players.reduce((sum, p) => sum + (p.salary || 0), 0);
    const staffWages = staff.reduce((sum, s) => sum + (s.salary || 0), 0);

    return Math.round((playerWages + staffWages) / 365);
  }

  async processDailyWages(
    teamId: number,
    currentDate: string,
    seasonId: number
  ): Promise<void> {
    const players = await playerRepository.findByTeamId(teamId);
    const staffMembers = await staffRepository.findByTeamId(teamId);

    const playerTotal =
      players.reduce((sum, p) => sum + (p.salary || 0), 0) / 365;
    const staffTotal =
      staffMembers.reduce((sum, s) => sum + (s.salary || 0), 0) / 365;

    if (playerTotal > 0) {
      await financialRepository.addRecord({
        teamId,
        seasonId,
        date: currentDate,
        type: "expense",
        category: FinancialCategory.SALARY,
        amount: Math.round(playerTotal),
        description: "Salários Diários - Jogadores",
      });
    }

    if (staffTotal > 0) {
      await financialRepository.addRecord({
        teamId,
        seasonId,
        date: currentDate,
        type: "expense",
        category: FinancialCategory.STAFF_SALARY,
        amount: Math.round(staffTotal),
        description: "Salários Diários - Staff",
      });
    }
  }

  async renewPlayerContract(
    playerId: number,
    newSalary: number,
    newEndDate: string
  ): Promise<void> {
    await playerRepository.update(playerId, {
      salary: newSalary,
      contractEnd: newEndDate,
    });
  }
}

export const contractService = new ContractService();
