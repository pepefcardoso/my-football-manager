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
import type {
  InfrastructureEvolutionData,
  ChartDataPoint,
} from "./domain/types/InfrastructureHistoryTypes";

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

      youth: {
        getPlayers: (teamId: number) => Promise<Player[]>;
        promote: (playerId: number, teamId: number) => Promise<boolean>;
        release: (playerId: number, teamId: number) => Promise<boolean>;
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
          tactics: Partial<any>
        ) => Promise<{ success: boolean; message: string }>;
        analyzeTactics: (matchId: number, isHome: boolean) => Promise<any>;
        suggestTactics: (
          matchId: number,
          isHome: boolean
        ) => Promise<Partial<any>>;
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
          narrativeEvent?: any | null;
          seasonRollover?: any;
        }>;
        updateTrainingFocus: (focus: string) => Promise<boolean>;
        saveGame: () => Promise<boolean>;
        listSaves: () => Promise<any[]>;
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
        startAutoSimulation: () => Promise<boolean>;
        stopAutoSimulation: () => Promise<boolean>;
        onDailyUpdate: (callback: (data: any) => void) => void;
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
        getDashboard: (
          teamId: number,
          seasonId: number
        ) => Promise<{
          currentBudget: number;
          monthlyIncome: number;
          monthlyExpenses: number;
          monthlyCashflow: number;
          salaryBill: {
            annual: number;
            monthly: number;
            playerCount: number;
          };
          operationalCosts: {
            annual: number;
            monthly: number;
          };
          projectedAnnualRevenue: number;
          financialHealth: string;
        } | null>;
        getOperationalCosts: (
          teamId: number,
          matchesPlayed: number
        ) => Promise<any>;
        projectAnnualRevenue: (
          teamId: number,
          leaguePosition: number,
          homeMatches: number
        ) => Promise<any>;
        calculatePlayerSalary: (
          playerId: number,
          teamId: number,
          isFreeTransfer: boolean
        ) => Promise<any>;
        getTeamWageBill: (teamId: number) => Promise<any>;
      };

      contract: {
        getWageBill: (teamId: number) => Promise<any | null>;
        renewPlayerContract: (
          playerId: number,
          newWage: number,
          newEndDate: string
        ) => Promise<boolean>;
      };

      infrastructure: {
        getStatus: (teamId: number) => Promise<InfrastructureStatus | null>;
        expandStadium: (
          teamId: number,
          seasonId: number
        ) => Promise<{ success: boolean; message: string }>;
        upgradeFacility: (
          teamId: number,
          seasonId: number,
          facilityType: "stadium" | "training" | "youth"
        ) => Promise<{ success: boolean; message: string }>;
        getUpgradeCost: (
          teamId: number,
          facilityType: "stadium" | "training" | "youth",
          upgradeType: "expand" | "quality"
        ) => Promise<number | null>;
        analyzeCapacity: (teamId: number) => Promise<any | null>;
        projectFanBase: (
          teamId: number,
          leaguePosition: number
        ) => Promise<number | null>;
        compareWithLeague: (teamId: number) => Promise<any | null>;
        getBenchmarks: (teamId: number) => Promise<any[]>;
        getTopRivals: (teamId: number, limit?: number) => Promise<any[]>;
        getEvolutionData: (
          teamId: number,
          startDate?: string,
          endDate?: string
        ) => Promise<InfrastructureEvolutionData | null>;
        getChartData: (
          teamId: number,
          metric: "capacity" | "quality" | "fanBase" | "utilization",
          startDate?: string,
          endDate?: string
        ) => Promise<ChartDataPoint[]>;
        getValuation: (teamId: number) => Promise<any | null>;
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
        getReceivedProposals: (teamId: number) => Promise<any[]>;
        getSentProposals: (teamId: number) => Promise<any[]>;
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
