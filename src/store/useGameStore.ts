import { create } from "zustand";
import type { Team } from "../domain/models";
import type { MenuOption } from "../domain/constants";

interface GameState {
  view: "start_screen" | "team_selection" | "game_loop";
  isLoading: boolean;
  currentDate: string;
  userTeam: Team | null;
  activePage: MenuOption;

  setView: (view: "start_screen" | "team_selection" | "game_loop") => void;
  setLoading: (loading: boolean) => void;
  startGame: (team: Team) => void;
  loadGame: (saveData: any) => void;
  navigateInGame: (page: MenuOption) => void;
  advanceDate: (newDate: string) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  view: "start_screen",
  isLoading: false,
  currentDate: "2025-01-15",
  userTeam: null,
  activePage: "club",

  setView: (view) => set({ view }),
  setLoading: (isLoading) => set({ isLoading }),

  startGame: (team) =>
    set({
      userTeam: team,
      view: "game_loop",
      activePage: "club",
    }),

  loadGame: (saveData) => {
    console.log("Load game logic here", saveData);
    set({ view: "game_loop" });
  },

  navigateInGame: (page) => set({ activePage: page }),

  advanceDate: (newDate) => set({ currentDate: newDate }),

  resetGame: () =>
    set({
      view: "start_screen",
      userTeam: null,
      currentDate: "2025-01-15",
    }),
}));
