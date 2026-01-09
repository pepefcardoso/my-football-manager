import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { produce } from "immer";
import { GameState } from "../core/models/gameState";
import { TimeAdvanceResult } from "../core/systems/TimeSystem";
import { advanceDayAction } from "./actions/timeActions";
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
import { logger } from "../core/utils/Logger";
import { setupNotificationBridge } from "./listeners/NotificationBinding";
import { rebuildIndices } from "../core/systems/MaintenanceSystem";

setupNotificationBridge();

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
    version: "2.0.0",
    saveName: "New Game",
    currentDate: Date.now(),
    currentUserManagerId: "",
    userClubId: null,
    activeSeasonId: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  people: {
    managers: {},
    players: {},
    staff: {},
    playerStates: {},
    playerInjuries: {},
    playerSecondaryPositions: {},
  },
  clubs: {
    clubs: {},
    infras: {},
    finances: {},
    relationships: {},
    rivalries: {},
    stadiums: {},
    sponsorships: {},
  },
  competitions: {
    seasons: {},
    competitions: {},
    competitionSeasons: {},
    clubCompetitionSeasons: {},
    fases: {},
    groups: {},
    standings: {},
    standingsLookup: {},
    rules: {
      classification: {},
      prizes: {},
    },
  },
  matches: {
    matches: {},
    events: {},
    playerStats: {},
    formations: {},
    positions: {},
    teamTactics: {},
  },
  market: {
    contracts: {},
    staffContracts: {},
    clubManagers: {},
    transferOffers: {},
    loans: {},
    scoutingKnowledge: {},
    playerContractIndex: {},
    clubSquadIndex: {},
  },
  world: {
    nations: {},
    cities: {},
  },
  system: {
    news: {},
    notifications: {},
    scheduledEvents: {},
    financialEntries: {},
    stats: {
      playerSeason: {},
    },
  },
});

let autoSaveInterval: NodeJS.Timeout | null = null;

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    ...createInitialState(),
    advanceDay: () => advanceDayAction(set),
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

      logger.info("GameStore", `💾 Salvando jogo: ${saveName}...`);

      const result = await saveGameToDisk(saveName, dataToSave);

      if (result.success) {
        set((state) => {
          state.meta.saveName = saveName;
          state.meta.updatedAt = Date.now();
        });
        logger.info("GameStore", "✅ Save concluído com sucesso");
      } else {
        logger.error("GameStore", "❌ Falha ao salvar", result.error);
      }

      return result;
    },

    loadGame: async (saveName: string) => {
      logger.info("GameStore", `📂 Carregando jogo: ${saveName}...`);

      const loadedState = await loadGameFromDisk(saveName);

      if (loadedState) {
        rebuildIndices(loadedState);

        set(() => ({ ...loadedState } as GameStore));
        logger.info("GameStore", "✅ Load concluído com sucesso");
        return true;
      }

      logger.error("GameStore", "❌ Falha ao carregar save");
      return false;
    },

    listSaves: async () => {
      return await listSaveFiles();
    },

    deleteSave: async (saveName: string) => {
      logger.info("GameStore", `🗑️ Deletando save: ${saveName}...`);
      const result = await deleteSaveFile(saveName);

      if (result.success) {
        logger.info("GameStore", "✅ Save deletado com sucesso");
      } else {
        logger.error("GameStore", "❌ Erro ao deletar", result.error);
      }

      return result;
    },

    getSaveInfo: async (saveName: string) => {
      return await getSaveInfo(saveName);
    },

    newGame: () => {
      logger.info("GameStore", "🎮 Criando novo jogo...");
      const newState = createNewGame();
      set(() => ({ ...newState } as GameStore));
      logger.info("GameStore", "✅ Novo jogo criado com sucesso");
    },

    resetGame: () => {
      logger.info("GameStore", "🔄 Resetando jogo...");
      set(() => ({ ...createInitialState() } as GameStore));
      logger.info("GameStore", "✅ Jogo resetado");
    },

    setState: (fn) => set(produce(fn)),

    enableAutoSave: (intervalMinutes: number) => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
      }

      const state = get();
      const saveName = state.meta.saveName || "autosave";

      logger.info(
        "GameStore",
        `⏰ Auto-save habilitado (${intervalMinutes} minutos)`
      );

      autoSaveInterval = setInterval(async () => {
        logger.info("GameStore", "💾 Executando auto-save...");
        const result = await get().saveGame(`${saveName}_autosave`);

        if (result.success) {
          logger.info("GameStore", "✅ Auto-save concluído");
        } else {
          logger.error("GameStore", "❌ Auto-save falhou", result.error);
        }
      }, intervalMinutes * 60 * 1000);
    },

    disableAutoSave: () => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
        logger.info("GameStore", "⏰ Auto-save desabilitado");
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
