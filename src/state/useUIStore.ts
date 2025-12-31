import { create } from "zustand";

export type GameView =
  | "MAIN_MENU"
  | "NEW_GAME_SETUP"
  | "DASHBOARD"
  | "SQUAD"
  | "TACTICS"
  | "CALENDAR"
  | "MARKET"
  | "CLUB_INFRA"
  | "SETTINGS";

interface UIState {
  currentView: GameView;
  sidebarOpen: boolean;
  setView: (view: GameView) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: "MAIN_MENU",
  sidebarOpen: true,

  setView: (view) => set({ currentView: view }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
