import { Logger } from "../lib/Logger";

export class TimeEngine {
  private static instance: TimeEngine;

  private currentDate: Date;
  private isRunning: boolean = false;
  private timer: NodeJS.Timeout | null = null;
  private logger: Logger;

  private simulationDelayMs: number = 1000;

  constructor(startDateStr: string = "2025-01-15") {
    this.currentDate = new Date(startDateStr);
    this.logger = new Logger("TimeEngine");
  }

  public static getInstance(startDateStr?: string): TimeEngine {
    if (!TimeEngine.instance) {
      TimeEngine.instance = new TimeEngine(startDateStr);
    }
    return TimeEngine.instance;
  }

  public start(onDayProcess: () => Promise<void>): void {
    if (this.isRunning) {
      this.logger.warn("TimeEngine já está em execução.");
      return;
    }

    this.isRunning = true;
    this.logger.info(`Simulação iniciada em: ${this.getDateString()}`);

    this.runSimulationLoop(onDayProcess);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.logger.info("Simulação parada.");
  }

  private async runSimulationLoop(
    processCallback: () => Promise<void>
  ): Promise<void> {
    if (!this.isRunning) return;

    try {
      await processCallback();

      if (!this.isRunning) return;

      this.advanceDay();

      this.timer = setTimeout(() => {
        this.runSimulationLoop(processCallback);
      }, this.simulationDelayMs);
    } catch (error) {
      this.logger.error(
        "Erro crítico no loop de simulação. Parando engine.",
        error
      );
      this.stop();
    }
  }

  public advanceDay(): string {
    this.currentDate.setDate(this.currentDate.getDate() + 1);
    return this.getDateString();
  }

  public addDays(days: number): string {
    this.currentDate.setDate(this.currentDate.getDate() + days);
    return this.getDateString();
  }

  public setDate(dateStr: string): void {
    this.currentDate = new Date(dateStr);
  }

  public setSimulationSpeed(delayMs: number): void {
    this.simulationDelayMs = Math.max(50, delayMs);
  }

  public getDateString(): string {
    return this.currentDate.toISOString().split("T")[0];
  }

  public getFormattedDate(): string {
    return this.currentDate.toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      weekday: "short",
    });
  }

  public isTransferWindowOpen(): boolean {
    const month = this.currentDate.getMonth();
    return month === 0 || month === 6;
  }

  public isSeasonEnd(): boolean {
    return (
      this.currentDate.getMonth() === 11 && this.currentDate.getDate() === 15
    );
  }
}
