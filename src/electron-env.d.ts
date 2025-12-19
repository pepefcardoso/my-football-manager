/// <reference types="vite/client" />
import type {
  Team,
  Player,
  Staff,
  Match,
  Competition,
  GameState,
  CompetitionStanding,
  FinancialHealthResult,
  TransferPermissionResult,
  MatchResult,
  ScoutedPlayerView,
  InfrastructureStatus,
  MonthlyFinancialSummary,
  MatchEventData,
} from "./domain/types";

interface PlayerStatRow {
  id: number;
  name: string;
  teamName: string;
  goals: number;
  assists: number;
  matches: number;
}

interface TransferHistoryRecord {
  id: number;
  playerId: number;
  playerName: string;
  fromTeamId: number | null;
  fromTeamName: string;
  toTeamId: number | null;
  toTeamName: string;
  fee: number;
  date: string;
  type: string;
  seasonId: number | null;
}

interface GoalkeeperStatRow {
  id: number;
  playerId: number;
  name: string;
  teamName: string;
  cleanSheets: number;
  saves: number;
  goalsConceded: number;
  matches: number;
}

interface MatchSimulationResult {
  currentMinute: number;
  score: { home: number; away: number };
  newEvents: MatchEventData[];
}

interface TransferNotificationPayload {
  type: "PROPOSAL_RECEIVED" | "TRANSFER_COMPLETED";
  message: string;
  details: any;
}

declare global {
  interface Window {
    electronAPI: {
      team: {
        getTeams: () => Promise<Team[]>;
      };

      player: {
        getPlayers: (teamId: number) => Promise<Player[]>;
        getYouthPlayers: (teamId: number) => Promise<Player[]>;
        getFreeAgents: () => Promise<Player[]>;
        getPlayerWithContract: (playerId: number) => Promise<Player | null>;
        updatePlayerCondition: (
          playerId: number,
          updates: { energy?: number; fitness?: number; moral?: number }
        ) => Promise<boolean>;
      };

      staff: {
        getStaff: (teamId: number) => Promise<Staff[]>;
        getFreeAgents: () => Promise<Staff[]>;
        hireStaff: (
          teamId: number,
          staffId: number,
          salary: number,
          contractEnd: string
        ) => Promise<boolean>;
        fireStaff: (staffId: number) => Promise<boolean>;
      };

      match: {
        getMatches: (teamId: number, seasonId: number) => Promise<Match[]>;
        startMatch: (matchId: number) => Promise<boolean>;
        pauseMatch: (matchId: number) => Promise<boolean>;
        resumeMatch: (matchId: number) => Promise<boolean>;
        simulateMatchMinute: (
          matchId: number
        ) => Promise<MatchSimulationResult | null>;
        simulateFullMatch: (matchId: number) => Promise<MatchResult | null>;
        getMatchState: (matchId: number) => Promise<{
          state: string;
          currentMinute: number;
          score: { home: number; away: number };
          events: MatchEventData[];
        } | null>;
        simulateMatchesOfDate: (date: string) => Promise<{
          matchesPlayed: number;
          results: Array<{ matchId: number; result: MatchResult }>;
        }>;

        substitutePlayer: (
          matchId: number,
          isHome: boolean,
          playerOutId: number,
          playerInId: number
        ) => Promise<{ success: boolean; message: string }>;
        updateLiveTactics: (
          matchId: number,
          isHome: boolean,
          tactics: Partial<TacticsConfig>
        ) => Promise<{ success: boolean; message: string }>;
        analyzeTactics: (matchId: number, isHome: boolean) => Promise<any>;
        suggestTactics: (
          matchId: number,
          isHome: boolean
        ) => Promise<Partial<TacticsConfig>>;
        savePreMatchTactics: (
          matchId: number,
          homeLineup: any,
          awayLineup: any
        ) => Promise<boolean>;
      };

      competition: {
        getCompetitions: () => Promise<Competition[]>;
        getTeamForm: (
          teamId: number,
          competitionId: number,
          seasonId: number
        ) => Promise<("W" | "D" | "L")[]>;
        getStandings: (
          competitionId: number,
          seasonId: number
        ) => Promise<(CompetitionStanding & { team: Team | null })[]>;
        getTopScorers: (
          competitionId: number,
          seasonId: number
        ) => Promise<PlayerStatRow[]>;
        getTopGoalkeepers: (
          competitionId: number,
          seasonId: number
        ) => Promise<GoalkeeperStatRow[]>;
      };

      game: {
        getGameState: () => Promise<GameState>;
        advanceDay: () => Promise<{
          date: string;
          messages: string[];
          stopReason?: string;
          narrativeEvent?: NarrativeEvent | null;
          seasonRollover?: any;
        }>;
        updateTrainingFocus: (focus: string) => Promise<boolean>;
        saveGame: () => Promise<boolean>;
        listSaves: () => Promise<GameSaveMetadata[]>;
        loadGame: (
          filename: string
        ) => Promise<{ success: boolean; message: string }>;
        startNewGame: (data: {
          teamId: number;
          saveName: string;
          managerName: string;
        }) => Promise<{ success: boolean; message: string }>;
        respondToEvent: (data: {
          eventId: string;
          optionId: string;
          teamId: number;
        }) => Promise<{ success: boolean; message: string }>;
      };

      finance: {
        checkFinancialHealth: (
          teamId: number
        ) => Promise<FinancialHealthResult | null>;
        canMakeTransfers: (teamId: number) => Promise<TransferPermissionResult>;
        getFinancialRecords: (
          teamId: number,
          seasonId: number
        ) => Promise<any[]>;
        getFinancialHealth: (teamId: number) => Promise<FinancialHealthResult>;
        getMonthlyReport: (
          teamId: number,
          seasonId: number
        ) => Promise<MonthlyFinancialSummary[]>;
      };

      contract: {
        getWageBill: (teamId: number) => Promise<MonthlyWageData | null>;
        renewPlayerContract: (
          playerId: number,
          newWage: number,
          newEndDate: string
        ) => Promise<boolean>;
      };

      infrastructure: {
        upgradeInfrastructure: (
          type:
            | "expand_stadium"
            | "upgrade_stadium"
            | "upgrade_training"
            | "upgrade_youth",
          teamId: number,
          seasonId: number
        ) => Promise<{ success: boolean; message: string }>;
        getInfrastructureStatus: (
          teamId: number
        ) => Promise<InfrastructureStatus | null>;
        getUpgradeCost: (
          teamId: number,
          type: "stadium" | "training" | "youth"
        ) => Promise<number | null>;
        getExpansionCost: () => Promise<number>;
      };

      scouting: {
        getScoutedPlayer: (
          playerId: number,
          teamId: number
        ) => Promise<ScoutedPlayerView | null>;
        getScoutingList: (teamId: number) => Promise<any[]>;
        assignScout: (scoutId: number, playerId: number) => Promise<boolean>;
        calculateScoutingAccuracy: (teamId: number) => Promise<number>;
      };

      transfer: {
        getReceivedProposals: (teamId: number) => Promise<TransferProposal[]>;
        getSentProposals: (teamId: number) => Promise<TransferProposal[]>;
        createProposal: (
          input: any
        ) => Promise<{ success: boolean; data?: number; message: string }>;
        respondToProposal: (
          input: any
        ) => Promise<{ success: boolean; message: string }>;
        finalizeTransfer: (
          proposalId: number
        ) => Promise<{ success: boolean; message: string }>;
        getTransferWindowStatus: (date: string) => Promise<string>;
        onNotification: (
          callback: (data: TransferNotificationPayload) => void
        ) => void;
        getTransferHistory: (
          teamId: number
        ) => Promise<TransferHistoryRecord[]>;
      };

      marketing: {
        getFanSatisfaction: (teamId: number) => Promise<number>;
        calculateTicketPriceImpact: (
          teamId: number,
          proposedPrice: number
        ) => Promise<{ impact: number; message: string } | null>;
      };

      season: {
        getCurrentSeason: () => Promise<any | null>;
        getRelegationZone: (
          competitionId: number,
          seasonId: number,
          zoneSize?: number
        ) => Promise<any[]>;
      };
    };
  }
}

export {};
