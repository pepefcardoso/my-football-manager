import { create } from "zustand";
import type { Team } from "../domain/models";
import type { MenuOption } from "../domain/constants";
import { Logger } from "../lib/Logger";
import type { NarrativeEvent } from "../domain/narrative";

const logger = new Logger("GameStore");

interface NewGameSetup {
  saveName: string;
  managerName: string;
}

interface GameState {
  view: "start_screen" | "team_selection" | "game_loop";
  activePage: MenuOption;

  userTeam: Team | null;
  newGameSetup: NewGameSetup | null;
  currentEvent: NarrativeEvent | null;
  currentDate: string;
  isProcessing: boolean;
  isPaused: boolean;
  isLoading: boolean;

  setView: (view: "start_screen" | "team_selection" | "game_loop") => void;
  setLoading: (loading: boolean) => void;
  setNewGameSetup: (data: NewGameSetup) => void;
  startGame: (team: Team) => void;
  updateUserTeam: (team: Team) => void;
  resetGame: () => void;
  navigateInGame: (page: MenuOption) => void;
  setProcessing: (isProcessing: boolean) => void;
  setPaused: (isPaused: boolean) => void;
  advanceDate: (newDate: string) => void;
  triggerEvent: (event: NarrativeEvent) => void;
  resolveEvent: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  view: "start_screen",
  activePage: "club",
  userTeam: null,
  newGameSetup: null,
  currentEvent: null,

  currentDate: "2025-01-15",
  isProcessing: false,
  isPaused: true,
  isLoading: false,

  setView: (view) => set({ view }),
  setLoading: (isLoading) => set({ isLoading }),
  setNewGameSetup: (data) => set({ newGameSetup: data }),

  startGame: (team) => {
    logger.info(`Iniciando jogo com o time: ${team.name}`);
    set({
      userTeam: team,
      view: "game_loop",
      activePage: "club",
      newGameSetup: null,
      currentEvent: null,
      isPaused: true,
      isProcessing: false,
    });
  },

  updateUserTeam: (team) => {
    set({ userTeam: team });
  },

  resetGame: () => {
    logger.info("Resetando estado do jogo para o menu inicial.");
    set({
      view: "start_screen",
      userTeam: null,
      currentDate: "2025-01-15",
      newGameSetup: null,
      currentEvent: null,
      isProcessing: false,
      isPaused: true,
    });
  },

  navigateInGame: (page) => set({ activePage: page }),

  setProcessing: (isProcessing) => set({ isProcessing }),

  setPaused: (isPaused) => {
    logger.info(isPaused ? "Simulação Pausada" : "Simulação Retomada");
    set({ isPaused });
  },

  advanceDate: (newDate) => {
    const previousDate = get().currentDate;
    if (previousDate !== newDate) {
      set({ currentDate: newDate });
    }
  },

  triggerEvent: (event) => {
    logger.info(
      `Evento Narrativo Acionado: ${event.title} [${event.importance}]`
    );
    set({
      currentEvent: event,
      isPaused: true,
      isProcessing: false,
    });
  },

  resolveEvent: () => {
    logger.info("Evento resolvido.");
    set({ currentEvent: null });
  },
}));
