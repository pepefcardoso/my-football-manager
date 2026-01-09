import { MatchEvent, PlayerMatchStats } from "../../models/match";
import { TeamMatchContext } from "./types";
import { IRNG } from "../../utils/generators";

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
  rng: IRNG;
}

export interface IMatchCommand {
  execute(ctx: SimulationContext): void;
}
