import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { GameState } from "../core/models/gameState";
import {
  advanceOneDay,
  advanceDays,
  advanceToNextMatch,
  TimeAdvanceResult,
} from "../core/systems/TimeSystem";

interface GameActions {
  advanceDay: () => TimeAdvanceResult;
  advanceMultipleDays: (days: number) => TimeAdvanceResult;
  advanceToNextUserMatch: () => TimeAdvanceResult | null;
  loadGame: (state: GameState) => void;
  resetGame: () => void;
  updateSaveName: (name: string) => void;
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
    advanceMultipleDays: (days: number) => {
      let result: TimeAdvanceResult = {
        newDate: 0,
        matchesToday: [],
        eventsProcessed: [],
        economyProcessed: false,
      };

      set((state) => {
        result = advanceDays(state, days);
      });

      return result;
    },
    advanceToNextUserMatch: () => {
      let result: TimeAdvanceResult | null = null;

      set((state) => {
        result = advanceToNextMatch(state);
      });

      return result;
    },
    loadGame: (loadedState: GameState) =>
      set((state) => {
        Object.assign(state, loadedState);
      }),
    resetGame: () =>
      set(() => ({
        ...initialState,
        meta: { ...initialState.meta, createdAt: Date.now() },
      })),
    updateSaveName: (name: string) =>
      set((state) => {
        state.meta.saveName = name;
        state.meta.updatedAt = Date.now();
      }),
  }))
);
