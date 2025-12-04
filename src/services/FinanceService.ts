import { FinancialCategory } from "../domain/enums";

export class FinanceService {
  static calculateDailyWageBill(annualSalaryTotal: number): number {
    return Math.round(annualSalaryTotal / 365);
  }

  static estimateTicketRevenue(
    stadiumCapacity: number,
    ticketPrice: number,
    fanSatisfaction: number,
    matchImportance: number
  ): number {
    const baseAttendance = stadiumCapacity * (fanSatisfaction / 100);
    const actualAttendance = Math.min(
      stadiumCapacity,
      baseAttendance * matchImportance
    );

    return Math.round(actualAttendance * ticketPrice);
  }

  static getTransactionDescription(
    category: FinancialCategory,
    detail?: string
  ): string {
    const map: Record<string, string> = {
      [FinancialCategory.SALARY]: "Pagamento de Salários",
      [FinancialCategory.TICKET_SALES]: "Receita de Bilheteira",
      [FinancialCategory.SPONSORS]: "Pagamento de Patrocínio",
      [FinancialCategory.STADIUM_MAINTENANCE]: "Manutenção do Estádio",
    };

    return detail
      ? `${map[category]} - ${detail}`
      : map[category] || "Transação Diversa";
  }
}
