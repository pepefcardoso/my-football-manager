import { TimeAdvanceResult, formatDate } from "./TimeSystem";
import { logger } from "../utils/Logger";

export interface SimulationCallbacks {
  onProgress: (daysSimulated: number, logs: string[]) => void;
  shouldStop: () => boolean;
  advanceDayFn: () => TimeAdvanceResult;
}

class SimulationSystem {
  private _isSimulating: boolean = false;
  private readonly TICK_RATE_MS = 200;

  public async simulateUntilDate(
    currentDate: number,
    targetDate: number,
    callbacks: SimulationCallbacks
  ): Promise<void> {
    this._isSimulating = true;
    let daysSimulated = 0;
    let now = currentDate;

    logger.info("SimulationSystem", `Iniciando simulação`, {
      from: formatDate(currentDate),
      to: formatDate(targetDate),
    });

    const startTime = performance.now();

    while (now < targetDate && this._isSimulating) {
      if (callbacks.shouldStop()) {
        logger.warn("SimulationSystem", "Simulação interrompida pelo usuário");
        this._isSimulating = false;
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, this.TICK_RATE_MS));

      const result = callbacks.advanceDayFn();

      now = result.newDate;
      daysSimulated++;

      const formattedLogs = result.events.map(
        (e) => `[${formatDate(result.newDate)}] ${e}`
      );

      callbacks.onProgress(daysSimulated, formattedLogs);
    }

    const totalTime = performance.now() - startTime;
    logger.info("SimulationSystem", "Simulação finalizada", {
      daysSimulated,
      totalTimeMs: totalTime.toFixed(0),
      avgTimePerDay: (totalTime / (daysSimulated || 1)).toFixed(2) + "ms",
    });

    this._isSimulating = false;
  }

  public cancel(): void {
    if (this._isSimulating) {
      logger.info("SimulationSystem", "Sinal de cancelamento recebido");
    }
    this._isSimulating = false;
  }

  public isSimulating(): boolean {
    return this._isSimulating;
  }
}

export const simulationSystem = new SimulationSystem();
