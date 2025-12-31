import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { produce } from "immer";
import { GameState } from "../core/models/gameState";
import {
  advanceOneDay,
  TimeAdvanceResult,
} from "../core/systems/TimeSystem";
import { saveGameToDisk, loadGameFromDisk } from "../data/fileSystem";
import { createNewGame } from "../data/initialSetup";

interface GameActions {
  advanceDay: () => TimeAdvanceResult;
  saveGame: (saveName: string) => Promise<boolean>;
  loadGame: (saveName: string) => Promise<boolean>;
  newGame: () => void;
  setState: (fn: (state: GameState) => void) => void;
}

type GameStore = GameState & GameActions;

const initialState: GameState = {
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
};

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    ...initialState,

    advanceDay: () => {
      let result: TimeAdvanceResult = {
        newDate: 0,
        matchesToday: [],
        eventsProcessed: [],
        economyProcessed: false,
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

      dataToSave.meta.saveName = saveName;
      dataToSave.meta.updatedAt = Date.now();

      const success = await saveGameToDisk(saveName, dataToSave);

      if (success) {
        set((state) => {
          state.meta.saveName = saveName;
        });
      }
      return success;
    },

    loadGame: async (saveName: string) => {
      const loadedState = await loadGameFromDisk(saveName);
      if (loadedState) {
        set(() => loadedState as GameStore);
        return true;
      }
      return false;
    },

    newGame: () => {
      const newState = createNewGame();
      set(() => ({ ...newState } as GameStore));
    },

    setState: (fn) => set(produce(fn)),
  }))
);
