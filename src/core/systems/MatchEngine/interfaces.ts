import { MatchEvent, PlayerMatchStats } from "../../models/match";
import { TeamMatchContext } from "./types";

export interface SimulationContext {
  matchId: string;
  home: TeamMatchContext;
  away: TeamMatchContext;
  currentMinute: number;
  extraMinute: number;
  period: "1H" | "2H" | "ET" | "PEN";
  momentum: number;
  events: MatchEvent[];
  playerStats: Record<string, PlayerMatchStats>;
  hasPossession: TeamMatchContext;
  defendingTeam: TeamMatchContext;
}

export interface IMatchCommand {
  execute(ctx: SimulationContext): void;
}
