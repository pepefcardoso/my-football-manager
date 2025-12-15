import { create } from "zustand";
import type { Team } from "../domain/models";
import type { MenuOption } from "../domain/constants";
import { Logger } from "../lib/Logger";

interface NewGameSetup {
  saveName: string;
  managerName: string;
}

interface GameState {
  view: "start_screen" | "team_selection" | "game_loop";
  isLoading: boolean;
  currentDate: string;
  userTeam: Team | null;
  activePage: MenuOption;
  newGameSetup: NewGameSetup | null;

  setView: (view: "start_screen" | "team_selection" | "game_loop") => void;
  setLoading: (loading: boolean) => void;

  setNewGameSetup: (data: NewGameSetup) => void;

  startGame: (team: Team) => void;
  loadGame: (saveData: any) => void;
  navigateInGame: (page: MenuOption) => void;
  advanceDate: (newDate: string) => void;
  resetGame: () => void;
}

const logger = new Logger("GameStore");

export const useGameStore = create<GameState>((set) => ({
  view: "start_screen",
  isLoading: false,
  currentDate: "2025-01-15",
  userTeam: null,
  activePage: "club",
  newGameSetup: null,

  setView: (view) => set({ view }),
  setLoading: (isLoading) => set({ isLoading }),

  setNewGameSetup: (data) => set({ newGameSetup: data }),

  startGame: (team) =>
    set({
      userTeam: team,
      view: "game_loop",
      activePage: "club",
      newGameSetup: null,
    }),

  loadGame: (saveData) => {
    logger.info("Load game logic executed", saveData);
    set({ view: "game_loop" });
  },

  navigateInGame: (page) => set({ activePage: page }),

  advanceDate: (newDate) => set({ currentDate: newDate }),

  resetGame: () =>
    set({
      view: "start_screen",
      userTeam: null,
      currentDate: "2025-01-15",
      newGameSetup: null,
    }),
}));
