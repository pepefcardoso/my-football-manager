import { ID, Money } from "../models/types";

export interface GameEventMap {
  PLAYER_INJURY_OCCURRED: {
    playerId: ID;
    injuryName: string;
    severity: string;
    daysOut: number;
  };
  PLAYER_RECOVERED: {
    playerId: ID;
    injuryName: string;
  };
  PLAYER_DEVELOPMENT_BOOST: {
    playerId: ID;
    attribute: string;
    value: number;
  };

  MATCH_FINISHED: {
    matchId: ID;
    homeScore: number;
    awayScore: number;
  };

  FINANCIAL_CRISIS_WARNING: {
    balance: Money;
  };

  CONTRACT_EXPIRING_SOON: {
    contractId: ID;
    playerId: ID;
    daysRemaining: number;
  };
}

export type GameEventKey = keyof GameEventMap;
