import { Match, MatchEvent, PlayerMatchStats } from "../../models/match";
import { TeamTactics } from "../../models/tactics";
import { Player } from "../../models/people";
import { ID } from "../../models/types";

export interface TeamMatchContext {
  clubId: ID;
  clubName: string;
  tactics: TeamTactics;
  startingXI: Player[];
  bench: Player[];
}

export interface MatchEngineResult {
  matchId: ID;
  homeScore: number;
  awayScore: number;
  homePenalties?: number;
  awayPenalties?: number;
  stats: {
    homePossession: number;
    awayPossession: number;
    // TODO: chutes, escanteios, etc.
  };
  events: MatchEvent[];
  playerStats: PlayerMatchStats[];
}

export interface IMatchSimulationStrategy {
  simulate(
    match: Match,
    home: TeamMatchContext,
    away: TeamMatchContext
  ): MatchEngineResult;
}
