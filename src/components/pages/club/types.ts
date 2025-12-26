import type { Team } from "../../../domain/models";

export interface ExtendedMatchInfo {
  date: string;
  opponentName: string;
  opponentShortName: string;
  competitionName: string;
  location: "HOME" | "AWAY";
  score?: string;
  result?: "W" | "D" | "L";
  opponent?: Team | null;
}

export interface SeasonSummary {
  seasonYear: number;
  championName: string;
  promotedTeams: number[];
  relegatedTeams: number[];
}
