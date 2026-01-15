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
import { rebuildIndices } from "../core/systems/MaintenanceSystem";
import { TempLineup } from "../core/models/match";
import {
  buildTeamContext,
  simulateSingleMatch,
} from "../core/systems/MatchSystem";
import { TacticsSystem } from "../core/systems/TacticsSystem";
import { rng } from "../core/utils/generators";
import { v4 as uuidv4 } from "uuid";
import { PlayerInjury } from "../core/models/stats";
import { eventBus } from "../core/events/EventBus";

interface GameActions {
  advanceDay: () => Promise<TimeAdvanceResult>;
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
  setTempLineup: (lineup: Omit<TempLineup, "lastUpdated">) => void;
  clearTempLineup: () => void;
  playMatch: (matchId: string) => void;
  autoPickLineup: () => void;
  movePlayerInLineup: (
    playerId: string,
    targetSection: "starters" | "bench" | "reserves"
  ) => void;
  prepareMatchLineup: (clubId: string) => void;
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
    persistenceMode: "DISK",
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
    tempLineup: null,
    scheduledMatches: {},
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
    advanceDay: async () => await advanceDayAction(set),
    saveGame: async (saveName: string) => {
      const state = get();
      const stateCopy = { ...state };

      const dataToSave = Object.fromEntries(
        Object.entries(stateCopy).filter(
          ([, value]) => typeof value !== "function"
        )
      ) as unknown as GameState;

      dataToSave.meta = {
        ...state.meta,
        saveName: saveName,
        updatedAt: Date.now(),
      };

      logger.info("GameStore", `💾 Solicitando salvamento: ${saveName}...`);

      const result = await saveGameToDisk(saveName, dataToSave);

      if (result.success) {
        set((state) => {
          state.meta.saveName = saveName;
          state.meta.updatedAt = Date.now();
          if (
            !result.metadata?.checksum ||
            result.metadata.checksum === "VOLATILE_MEMORY_HASH"
          ) {
            state.meta.persistenceMode = "MEMORY";
          }
        });

        const modeMsg =
          result.metadata?.checksum === "VOLATILE_MEMORY_HASH"
            ? "(RAM)"
            : "(Disco)";
        logger.info("GameStore", `✅ Save concluído ${modeMsg}`);
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

    setTempLineup: (lineupData) => {
      set((state) => {
        state.matches.tempLineup = {
          ...lineupData,
          lastUpdated: Date.now(),
        };
      });
    },

    clearTempLineup: () => {
      set((state) => {
        state.matches.tempLineup = null;
      });
    },

    playMatch: async (matchId: string) => {
      const { userClubId } = get().meta;
      const { tempLineup } = get().matches;

      if (!userClubId) {
        logger.error("GameStore", "❌ Erro: Usuário sem clube.");
        return;
      }

      if (!tempLineup || tempLineup.starters.length !== 11) {
        logger.error(
          "GameStore",
          "❌ Erro: Escalação inválida (precisa de 11)."
        );
        return;
      }

      logger.info(
        "GameStore",
        `⚽ Iniciando simulação da partida ${matchId}...`
      );

      const state = get();
      const match = state.matches.matches[matchId];
      if (!match) return;

      const isHome = match.homeClubId === userClubId;
      const opponentId = isHome ? match.awayClubId : match.homeClubId;

      const userContext = buildTeamContext(state, userClubId, {
        startingXI: state.matches.tempLineup!.starters,
        bench: state.matches.tempLineup!.bench,
      });
      const opponentContext = buildTeamContext(state, opponentId);

      const result = await simulateSingleMatch(
        state,
        match,
        isHome ? userContext : opponentContext,
        isHome ? opponentContext : userContext
      );

      set((draft) => {
        const draftMatch = draft.matches.matches[matchId];
        if (!draftMatch) return;

        draftMatch.homeGoals = result.homeScore;
        draftMatch.awayGoals = result.awayScore;
        draftMatch.status = "FINISHED";
        draft.matches.events[matchId] = result.events;

        result.playerStats.forEach((stat) => {
          draft.matches.playerStats[stat.id] = stat;
        });

        const injuryEvents = result.events.filter((e) => e.type === "INJURY");

        injuryEvents.forEach((event) => {
          const severityRoll = rng.range(1, 100);
          let severity = "Leve";
          let daysOut = rng.range(3, 10);

          if (severityRoll > 90) {
            severity = "Grave";
            daysOut = rng.range(60, 180);
          } else if (severityRoll > 70) {
            severity = "Moderada";
            daysOut = rng.range(14, 45);
          }

          const injuryId = uuidv4();
          const currentDate = draft.meta.currentDate;
          const returnDate = currentDate + daysOut * 24 * 60 * 60 * 1000;

          const injury: PlayerInjury = {
            id: injuryId,
            playerId: event.playerId,
            name: "Lesão em Jogo",
            severity,
            startDate: currentDate,
            estimatedReturnDate: returnDate,
          };

          draft.people.playerInjuries[injuryId] = injury;

          const pState = draft.people.playerStates[event.playerId];
          if (pState) {
            pState.fitness = 50;
            pState.matchReadiness = 0;
          }

          eventBus.emit(state, "PLAYER_INJURY_OCCURRED", {
            playerId: event.playerId,
            injuryName: "Lesão durante a partida",
            severity,
            daysOut,
          });
        });

        draft.matches.tempLineup = null;

        eventBus.emit(state, "MATCH_FINISHED", {
          matchId: match.id,
          homeScore: result.homeScore,
          awayScore: result.awayScore,
        });
      });

      logger.info("GameStore", "✅ Partida finalizada e estado atualizado.");
    },

    prepareMatchLineup: (clubId: string) => {
      const state = get();

      if (!state.clubs.clubs[clubId]) {
        logger.error(
          "GameStore",
          `❌ Falha ao preparar lineup: Clube ${clubId} não encontrado.`
        );
        return;
      }

      logger.info(
        "GameStore",
        `📋 Gerando melhor escalação inicial para ${clubId}...`
      );

      const recommendation = TacticsSystem.suggestOptimalLineup(
        clubId,
        state.people.players,
        state.market.contracts
      );

      set((draft) => {
        draft.matches.tempLineup = {
          ...recommendation,
          lastUpdated: Date.now(),
        };
      });
    },

    autoPickLineup: () => {
      const state = get();
      const { userClubId } = state.meta;

      if (!userClubId) return;

      const recommendation = TacticsSystem.suggestOptimalLineup(
        userClubId,
        state.people.players,
        state.market.contracts
      );

      set((state) => {
        state.matches.tempLineup = {
          ...recommendation,
          lastUpdated: Date.now(),
        };
      });
    },

    movePlayerInLineup: (playerId, targetSection) => {
      set((state) => {
        const lineup = state.matches.tempLineup;
        if (!lineup) return;

        const removeFromList = (list: string[]) => {
          const idx = list.indexOf(playerId);
          if (idx > -1) list.splice(idx, 1);
          return idx > -1;
        };

        removeFromList(lineup.starters);
        const wasBench = removeFromList(lineup.bench);
        removeFromList(lineup.reserves);

        if (targetSection === "starters") {
          if (lineup.starters.length >= 11) {
            const removedPlayerId = lineup.starters.pop();
            if (removedPlayerId) {
              if (wasBench) lineup.bench.push(removedPlayerId);
              else lineup.reserves.push(removedPlayerId);
            }
          }
          lineup.starters.push(playerId);
        } else if (targetSection === "bench") {
          lineup.bench.push(playerId);
        } else {
          lineup.reserves.push(playerId);
        }

        lineup.lastUpdated = Date.now();
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
