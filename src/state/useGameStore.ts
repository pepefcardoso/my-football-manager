import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { produce } from "immer";
import { GameState } from "../core/models/gameState";
import { advanceOneDay, TimeAdvanceResult } from "../core/systems/TimeSystem";
import {
  saveGameToDisk,
  loadGameFromDisk,
  listSaveFiles,
  deleteSaveFile,
  getSaveInfo,
  SaveResult,
  SaveInfo,
} from "../data/fileSystem";
import { createNewGame } from "../data/initialSetup";
import {
  deleteNotification,
  markAsRead,
} from "../core/systems/NotificationSystem";

interface GameActions {
  advanceDay: () => TimeAdvanceResult;
  saveGame: (saveName: string) => Promise<SaveResult>;
  loadGame: (saveName: string) => Promise<boolean>;
  listSaves: () => Promise<string[]>;
  deleteSave: (saveName: string) => Promise<SaveResult>;
  getSaveInfo: (saveName: string) => Promise<SaveInfo | null>;
  newGame: () => void;
  resetGame: () => void;
  setState: (fn: (state: GameState) => void) => void;
  enableAutoSave: (intervalMinutes: number) => void;
  disableAutoSave: () => void;
  markNotificationAsRead: (id: string) => void;
  deleteNotification: (id: string) => void;
}

type GameStore = GameState & GameActions;

const createInitialState = (): GameState => ({
  meta: {
    version: "1.0.0",
    saveName: "New Game",
    currentDate: Date.now(),
    currentUserManagerId: "",
    userClubId: null,
    activeSeasonId: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  managers: {},
  players: {},
  staff: {},
  scoutingKnowledge: {},
  clubs: {},
  clubInfras: {},
  clubFinances: {},
  clubRelationships: {},
  clubRivalries: {},
  financialEntries: {},
  stadiums: {},
  sponsorships: {},
  nations: {},
  cities: {},
  seasons: {},
  competitions: {},
  competitionSeasons: {},
  clubCompetitionSeasons: {},
  competitionFases: {},
  competitionGroups: {},
  classificationRules: {},
  prizeRules: {},
  standings: {},
  matches: {},
  matchEvents: {},
  contracts: {},
  clubManagers: {},
  staffContracts: {},
  transferOffers: {},
  playerLoans: {},
  playerStates: {},
  playerInjuries: {},
  playerSeasonStats: {},
  playerMatchStats: {},
  playerSecondaryPositions: {},
  formations: {},
  positions: {},
  teamTactics: {},
  news: {},
  scheduledEvents: {},
  gameEvents: {},
  notifications: {},
});

let autoSaveInterval: NodeJS.Timeout | null = null;

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    ...createInitialState(),

    advanceDay: () => {
      let result: TimeAdvanceResult = {
        newDate: 0,
        matchesToday: [],
        events: [],
        stats: { expensesProcessed: 0, playersRecovered: 0 },
      };

      set((state) => {
        result = advanceOneDay(state);
      });

      return result;
    },

    saveGame: async (saveName: string) => {
      const state = get();
      const stateCopy = { ...state };
      const dataToSave = Object.fromEntries(
        Object.entries(stateCopy).filter(
          ([_key, value]) => typeof value !== "function"
        )
      ) as unknown as GameState;

      dataToSave.meta = {
        ...state.meta,
        saveName: saveName,
        updatedAt: Date.now(),
      };

      console.log(`💾 Salvando jogo: ${saveName}...`);

      const result = await saveGameToDisk(saveName, dataToSave);

      if (result.success) {
        set((state) => {
          state.meta.saveName = saveName;
          state.meta.updatedAt = Date.now();
        });
        console.log("✅ Save concluído com sucesso");
      } else {
        console.error("❌ Falha ao salvar:", result.error);
      }

      return result;
    },

    loadGame: async (saveName: string) => {
      console.log(`📂 Carregando jogo: ${saveName}...`);

      const loadedState = await loadGameFromDisk(saveName);

      if (loadedState) {
        set(() => ({ ...loadedState } as GameStore));
        console.log("✅ Load concluído com sucesso");
        return true;
      }

      console.error("❌ Falha ao carregar save");
      return false;
    },

    listSaves: async () => {
      return await listSaveFiles();
    },

    deleteSave: async (saveName: string) => {
      console.log(`🗑️ Deletando save: ${saveName}...`);
      const result = await deleteSaveFile(saveName);

      if (result.success) {
        console.log("✅ Save deletado com sucesso");
      } else {
        console.error("❌ Erro ao deletar:", result.error);
      }

      return result;
    },

    getSaveInfo: async (saveName: string) => {
      return await getSaveInfo(saveName);
    },

    newGame: () => {
      console.log("🎮 Criando novo jogo...");
      const newState = createNewGame();
      set(() => ({ ...newState } as GameStore));
      console.log("✅ Novo jogo criado com sucesso");
    },

    resetGame: () => {
      console.log("🔄 Resetando jogo...");
      set(() => ({ ...createInitialState() } as GameStore));
      console.log("✅ Jogo resetado");
    },

    setState: (fn) => set(produce(fn)),

    enableAutoSave: (intervalMinutes: number) => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
      }

      const state = get();
      const saveName = state.meta.saveName || "autosave";

      console.log(`⏰ Auto-save habilitado (${intervalMinutes} minutos)`);

      autoSaveInterval = setInterval(async () => {
        console.log("💾 Executando auto-save...");
        const result = await get().saveGame(`${saveName}_autosave`);

        if (result.success) {
          console.log("✅ Auto-save concluído");
        } else {
          console.error("❌ Auto-save falhou:", result.error);
        }
      }, intervalMinutes * 60 * 1000);
    },

    disableAutoSave: () => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
        console.log("⏰ Auto-save desabilitado");
      }
    },

    markNotificationAsRead: (id: string) => {
      set((state) => {
        markAsRead(state, id);
      });
    },

    deleteNotification: (id: string) => {
      set((state) => {
        deleteNotification(state, id);
      });
    },
  }))
);

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
    }
  });
}
