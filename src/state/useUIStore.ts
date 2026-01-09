import { create } from "zustand";

export type GameView =
  | "MAIN_MENU"
  | "NEW_GAME_SETUP"
  | "DASHBOARD"
  | "SQUAD"
  | "TACTICS"
  | "CALENDAR"
  | "COMPETITIONS"
  | "MARKET"
  | "CLUB_INFRA"
  | "MATCH_PREPARATION"
  | "MATCH_LIVE"
  | "MATCH_RESULT"
  | "MANAGER_PROFILE"
  | "SETTINGS";

interface UIState {
  currentView: GameView;
  activeMatchId: string | null;
  sidebarOpen: boolean;
  isProcessing: boolean;
  processingMessage: string | null;
  processingProgress?: number;
  processingType: "loading" | "success";
  setView: (view: GameView, matchId?: string) => void;
  toggleSidebar: () => void;
  startProcessing: (message: string, type?: "loading" | "success") => void;
  setProcessingProgress: (progress: number) => void;
  stopProcessing: (delayMs?: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: "MAIN_MENU",
  activeMatchId: null,
  sidebarOpen: true,
  isProcessing: false,
  processingMessage: null,
  processingProgress: undefined,
  processingType: "loading",

  setView: (view, matchId) =>
    set((state) => ({
      currentView: view,
      activeMatchId: matchId !== undefined ? matchId : state.activeMatchId,
    })),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  startProcessing: (message, type = "loading") =>
    set({
      isProcessing: true,
      processingMessage: message,
      processingType: type,
      processingProgress: undefined,
    }),

  setProcessingProgress: (progress) =>
    set({
      processingProgress: progress,
    }),

  stopProcessing: (delayMs = 0) => {
    if (delayMs > 0) {
      setTimeout(() => {
        set({
          isProcessing: false,
          processingMessage: null,
          processingProgress: undefined,
        });
      }, delayMs);
    } else {
      set({
        isProcessing: false,
        processingMessage: null,
        processingProgress: undefined,
      });
    }
  },
}));
