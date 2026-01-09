import { TimeAdvanceResult, formatDate } from "./TimeSystem";
import { logger } from "../utils/Logger";

export interface SimulationCallbacks {
  onProgress: (daysSimulated: number, logs: string[]) => void;
  shouldStop: () => boolean;
  advanceDayFn: () => TimeAdvanceResult;
}

class SimulationSystem {
  private _executionPromise: Promise<void> | null = null;
  private _abortTriggered: boolean = false;

  private readonly TICK_RATE_MS = 200;

  public async simulateUntilDate(
    currentDate: number,
    targetDate: number,
    callbacks: SimulationCallbacks
  ): Promise<void> {
    if (this._executionPromise) {
      logger.warn(
        "SimulationSystem",
        "⚠️ Tentativa de execução paralela detectada. Aderindo ao processo existente."
      );
      return this._executionPromise;
    }

    this._abortTriggered = false;

    this._executionPromise = this._runSimulationLoop(
      currentDate,
      targetDate,
      callbacks
    );

    try {
      await this._executionPromise;
    } finally {
      this._executionPromise = null;
      this._abortTriggered = false;
      logger.debug("SimulationSystem", "Mutex liberado.");
    }
  }

  private async _runSimulationLoop(
    startDate: number,
    targetDate: number,
    callbacks: SimulationCallbacks
  ): Promise<void> {
    let daysSimulated = 0;
    let now = startDate;

    logger.info("SimulationSystem", `🚀 Iniciando simulação (Thread Segura)`, {
      from: formatDate(startDate),
      to: formatDate(targetDate),
    });

    const startTime = performance.now();

    while (now < targetDate) {
      if (this._abortTriggered || callbacks.shouldStop()) {
        logger.warn(
          "SimulationSystem",
          "Simulação interrompida (Sinal de Parada)"
        );
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, this.TICK_RATE_MS));

      if (this._abortTriggered) break;

      try {
        const result = callbacks.advanceDayFn();

        now = result.newDate;
        daysSimulated++;

        const formattedLogs = result.events.map(
          (e) => `[${formatDate(result.newDate)}] ${e}`
        );

        callbacks.onProgress(daysSimulated, formattedLogs);
      } catch (error) {
        logger.error(
          "SimulationSystem",
          "❌ Erro crítico durante um dia de simulação",
          error
        );
        throw error;
      }
    }

    const totalTime = performance.now() - startTime;
    logger.info("SimulationSystem", "🏁 Simulação finalizada", {
      daysSimulated,
      totalTimeMs: totalTime.toFixed(0),
      avgTimePerDay: (totalTime / (daysSimulated || 1)).toFixed(2) + "ms",
    });
  }

  public cancel(): void {
    if (this._executionPromise) {
      logger.info("SimulationSystem", "🛑 Sinal de cancelamento recebido.");
      this._abortTriggered = true;
    }
  }

  public isSimulating(): boolean {
    return this._executionPromise !== null;
  }
}

export const simulationSystem = new SimulationSystem();
