import { RandomEngine } from "../../engine/RandomEngine";
import type { Player, FinancialRecord } from "../../domain/models";

export interface MaskedAttribute {
  value: number | string;
  isExact: boolean;
  min?: number;
  max?: number;
}

export interface ScoutedPlayerView extends Player {
  visibleAttributes: Record<string, MaskedAttribute>;
  scoutingStatus: {
    isObserved: boolean;
    progress: number;
    lastUpdate: string;
  };
  teamName: string;
}

export interface MonthlyFinancialSummary {
  month: string;
  income: number;
  expense: number;
  balance: number;
  categories: Record<string, number>;
}

export class ScoutingReportFactory {
  static createView(
    player: Player,
    progress: number,
    lastUpdate: string | null,
    viewerTeamId: number,
    teamName: string
  ): ScoutedPlayerView {
    const isOwnPlayer = player.teamId === viewerTeamId;
    const effectiveProgress = isOwnPlayer ? 100 : progress;

    const attrs = this.extractAttributes(player);
    const visibleAttributes: Record<string, MaskedAttribute> = {};

    for (const [key, val] of Object.entries(attrs)) {
      visibleAttributes[key] = this.maskValue(val, effectiveProgress);
    }

    return {
      ...player,
      visibleAttributes,
      scoutingStatus: {
        isObserved: effectiveProgress > 0,
        progress: effectiveProgress,
        lastUpdate: isOwnPlayer ? "Hoje" : lastUpdate || "Nunca",
      },
      teamName,
    };
  }

  private static maskValue(
    realValue: number,
    progress: number
  ): MaskedAttribute {
    if (progress >= 100) {
      return {
        value: realValue,
        isExact: true,
        min: realValue,
        max: realValue,
      };
    }

    const uncertainty = Math.max(1, Math.round(10 - progress / 10));
    const noise = RandomEngine.getInt(-1, 1);
    const estimatedCenter = Math.max(1, Math.min(99, realValue + noise));

    const min = Math.max(1, estimatedCenter - uncertainty);
    const max = Math.min(99, estimatedCenter + uncertainty);

    return {
      value: `${min}-${max}`,
      isExact: false,
      min,
      max,
    };
  }

  private static extractAttributes(player: Player): Record<string, number> {
    return {
      finishing: player.finishing,
      passing: player.passing,
      dribbling: player.dribbling,
      defending: player.defending,
      physical: player.physical,
      pace: player.pace,
      shooting: player.shooting,
      overall: player.overall,
      potential: player.potential,
    };
  }
}

export class FinancialReportFactory {
  static createMonthlyReport(
    records: FinancialRecord[]
  ): MonthlyFinancialSummary[] {
    const summaryMap = new Map<string, MonthlyFinancialSummary>();

    for (const record of records) {
      const date = new Date(record.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}`;

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          month: key,
          income: 0,
          expense: 0,
          balance: 0,
          categories: {},
        });
      }

      const summary = summaryMap.get(key)!;
      const amount = record.amount;

      if (record.type === "income") {
        summary.income += amount;
        summary.balance += amount;
      } else {
        summary.expense += amount;
        summary.balance -= amount;
      }

      if (!summary.categories[record.category]) {
        summary.categories[record.category] = 0;
      }
      summary.categories[record.category] +=
        record.type === "income" ? amount : -amount;
    }

    return Array.from(summaryMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );
  }
}
