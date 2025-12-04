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
      getCompetitions: () => Promise<Competition[]>;
      updateTrainingFocus: (focus: string) => Promise<boolean>;

      getGameState: () => Promise<GameState>;
      advanceDay: () => Promise<{ date: string; messages: string[] }>;
      saveGame: () => Promise<boolean>;
      loadGame: () => Promise<boolean>;

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
    };
  }
}

export {};
