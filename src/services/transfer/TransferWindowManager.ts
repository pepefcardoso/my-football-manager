import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import { Result } from "../../domain/ServiceResults";
import type { ServiceResult } from "../../domain/ServiceResults";
import { getBalanceValue } from "../../engine/GameBalanceConfig";

const TRANSFER_WINDOWS = getBalanceValue("SEASON").TRANSFER_WINDOWS;

export class TransferWindowManager extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "TransferWindowManager");
  }

  /**
   * Verifica se a janela de transferências está aberta na data fornecida.
   * @param dateStr Data no formato "YYYY-MM-DD"
   */
  public isWindowOpen(dateStr: string): boolean {
    const date = new Date(dateStr);
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    return TRANSFER_WINDOWS.some(
      (window) =>
        month >= window.startMonth &&
        month <= window.endMonth &&
        day >= window.startDay &&
        day <= window.endDay
    );
  }

  /**
   * Retorna o número de dias restantes na janela atual.
   * Retorna 0 se a janela estiver fechada.
   * @param dateStr Data no formato "YYYY-MM-DD"
   */
  public getDaysRemaining(dateStr: string): number {
    if (!this.isWindowOpen(dateStr)) {
      return 0;
    }

    const date = new Date(dateStr);
    const month = date.getUTCMonth();

    const activeWindow = TRANSFER_WINDOWS.find(
      (w) => month >= w.startMonth && month <= w.endMonth
    );

    if (!activeWindow) return 0;

    const year = date.getUTCFullYear();
    const endDate = new Date(
      Date.UTC(year, activeWindow.endMonth, activeWindow.endDay)
    );

    const diffTime = Math.abs(endDate.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Valida se uma operação de transferência pode ocorrer na data informada.
   * Utilizado para bloquear propostas fora de época.
   * @param dateStr Data no formato "YYYY-MM-DD"
   */
  public validateTransferTiming(dateStr: string): ServiceResult<void> {
    if (this.isWindowOpen(dateStr)) {
      return Result.success(undefined, "Janela de transferências aberta.");
    }

    return Result.businessRule(
      "A janela de transferências está fechada neste momento."
    );
  }

  /**
   * Retorna informações sobre a próxima janela ou a janela atual.
   */
  public getWindowStatus(dateStr: string): string {
    if (this.isWindowOpen(dateStr)) {
      const days = this.getDaysRemaining(dateStr);
      return `Aberta (${days} dias restantes)`;
    }
    return "Fechada";
  }
}
