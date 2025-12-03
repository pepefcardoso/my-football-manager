/// <reference types="vite/client" />
import type {
  Team,
  Player,
  Staff,
  Match,
  Competition,
  GameState,
} from "./domain/types";

declare namespace NodeJS {
  interface Process {
    resourcesPath: string;
  }
}

interface Window {
  electronAPI: {
    getTeams: () => Promise<Team[]>;
    getPlayers: (teamId: number) => Promise<Player[]>;
    getStaff: (teamId: number) => Promise<Staff[]>;
    getMatches: (teamId: number, seasonId: number) => Promise<Match[]>;
    getCompetitions: () => Promise<Competition[]>;

    getGameState: () => Promise<GameState>;
    advanceDay: () => Promise<{ date: string; messages: string[] }>;
    saveGame: () => Promise<boolean>;
    loadGame: () => Promise<boolean>;
  };
}
