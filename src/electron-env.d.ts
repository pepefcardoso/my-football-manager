/// <reference types="vite/client" />
import type {
  Team,
  Player,
  Staff,
  Match,
  Competition,
  GameState,
} from "./domain/types";
import type { MatchResult } from "./engine/MatchEngine";

declare global {
  interface Window {
    electronAPI: {
      getTeams: () => Promise<Team[]>;

      getPlayers: (teamId: number) => Promise<Player[]>;

      getStaff: (teamId: number) => Promise<Staff[]>;

      getMatches: (teamId: number, seasonId: number) => Promise<Match[]>;
      startMatch: (matchId: number) => Promise<boolean>;
      pauseMatch: (matchId: number) => Promise<boolean>;
      resumeMatch: (matchId: number) => Promise<boolean>;
      simulateMatchMinute: (matchId: number) => Promise<{
        currentMinute: number;
        score: { home: number; away: number };
        newEvents: any[];
      } | null>;
      simulateFullMatch: (matchId: number) => Promise<MatchResult | null>;
      getMatchState: (matchId: number) => Promise<{
        state: string;
        currentMinute: number;
        score: { home: number; away: number };
        events: any[];
      } | null>;
      simulateMatchesOfDate: (date: string) => Promise<{
        matchesPlayed: number;
        results: Array<{ matchId: number; result: MatchResult }>;
      }>;

      getCompetitions: () => Promise<Competition[]>;

      getGameState: () => Promise<GameState>;
      advanceDay: () => Promise<{ date: string; messages: string[] }>;
      updateTrainingFocus: (focus: string) => Promise<boolean>;

      checkFinancialHealth: (teamId: number) => Promise<{
        isHealthy: boolean;
        currentBudget: number;
        hasTransferBan: boolean;
        penaltiesApplied: string[];
        severity: "none" | "warning" | "critical";
      } | null>;

      canMakeTransfers: (teamId: number) => Promise<{
        allowed: boolean;
        reason?: string;
      }>;

      getWageBill: (teamId: number) => Promise<{
        playerWages: number;
        staffWages: number;
        total: number;
        playerCount: number;
        staffCount: number;
      } | null>;

      getFinancialRecords: (teamId: number, seasonId: number) => Promise<any[]>;
      getFinancialHealth: (teamId: number) => Promise<{
        isHealthy: boolean;
        currentBudget: number;
        hasTransferBan: boolean;
        penaltiesApplied: string[];
        severity: "none" | "warning" | "critical";
      }>;

      upgradeInfrastructure: (
        type:
          | "expand_stadium"
          | "upgrade_stadium"
          | "upgrade_training"
          | "upgrade_youth",
        teamId: number,
        seasonId: number
      ) => Promise<{ success: boolean; message: string }>;

      saveGame: () => Promise<boolean>;
      loadGame: () => Promise<boolean>;
    };
  }
}

export {};
