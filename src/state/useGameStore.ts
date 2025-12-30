import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { GameState } from "../core/models/gameState";

interface GameActions {
  advanceDay: () => void;
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
  immer((set) => ({
    ...initialState,
    advanceDay: () =>
      set((state) => {
        // Lógica simplificada por enquanto (placeholder)
        // No futuro, isso chamará o TimeSystem.advance(state)
        const oneDayMs = 24 * 60 * 60 * 1000;
        state.meta.currentDate += oneDayMs;
        state.meta.updatedAt = Date.now();
      }),
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
      }),
  }))
);
