export class TimeEngine {
  private currentDate: Date;

  constructor(startDateStr: string = "2025-01-15") {
    this.currentDate = new Date(startDateStr);
  }

  getDateString(): string {
    return this.currentDate.toISOString().split("T")[0];
  }

  getFormattedDate(): string {
    return this.currentDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      weekday: "short",
    });
  }

  advanceDay(): string {
    this.currentDate.setDate(this.currentDate.getDate() + 1);
    return this.getDateString();
  }

  addDays(days: number): string {
    this.currentDate.setDate(this.currentDate.getDate() + days);
    return this.getDateString();
  }

  isTransferWindowOpen(): boolean {
    const month = this.currentDate.getMonth();
    return month === 0 || month === 6;
  }

  isSeasonEnd(): boolean {
    return (
      this.currentDate.getMonth() === 11 && this.currentDate.getDate() === 15
    );
  }
}
