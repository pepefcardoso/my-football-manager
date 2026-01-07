import { TimeAdvanceResult, formatDate } from "./TimeSystem";

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

    console.log(
      `[SimulationSystem] Iniciando simulação até ${formatDate(targetDate)}`
    );

    while (now < targetDate && this._isSimulating) {
      if (callbacks.shouldStop()) {
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

    this._isSimulating = false;
  }

  public cancel(): void {
    this._isSimulating = false;
  }

  public isSimulating(): boolean {
    return this._isSimulating;
  }
}

export const simulationSystem = new SimulationSystem();
