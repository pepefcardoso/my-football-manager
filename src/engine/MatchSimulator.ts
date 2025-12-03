import { RandomEngine } from "./RandomEngine";
import { MatchEventType, Position } from "../domain/types";

interface SimPlayer {
  id: number;
  name: string;
  position: string;
  overall: number;
  energy: number;
}

interface SimTeam {
  id: number;
  name: string;
  players: SimPlayer[];
  tactics?: {
    aggression: "low" | "normal" | "high";
  };
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
  events: {
    minute: number;
    type: MatchEventType;
    description: string;
    teamId: number;
    playerId?: number;
  }[];
  stats: {
    homePossession: number;
    awayPossession: number;
    homeShots: number;
    awayShots: number;
  };
}

export class MatchSimulator {
  static simulate(homeTeam: SimTeam, awayTeam: SimTeam): MatchResult {
    const homeStrength = this.calculateTeamStrength(homeTeam);
    const awayStrength = this.calculateTeamStrength(awayTeam);

    const homeAdvantage = 1.05;
    const totalStrength = homeStrength * homeAdvantage + awayStrength;

    const homePossession = Math.round(
      ((homeStrength * homeAdvantage) / totalStrength) * 100
    );

    let homeScore = 0;
    let awayScore = 0;
    const events: MatchResult["events"] = [];
    let homeShots = 0;
    let awayShots = 0;

    for (let minute = 1; minute <= 90; minute++) {
      if (RandomEngine.chance(15)) {
        const isHomeAttacking = RandomEngine.chance(homePossession);
        const attackingTeam = isHomeAttacking ? homeTeam : awayTeam;
        const defendingTeam = isHomeAttacking ? awayTeam : homeTeam;

        if (RandomEngine.chance(10)) {
          if (isHomeAttacking) homeShots++;
          else awayShots++;

          const attackFactor = isHomeAttacking
            ? homeStrength / awayStrength
            : awayStrength / homeStrength;

          if (RandomEngine.chance(8 * attackFactor)) {
            const scorer = this.selectScorer(attackingTeam.players);
            if (isHomeAttacking) homeScore++;
            else awayScore++;

            events.push({
              minute,
              type: MatchEventType.GOAL,
              description: `GOL! ${scorer.name} marca para o ${attackingTeam.name}!`,
              teamId: attackingTeam.id,
              playerId: scorer.id,
            });
          }
        }

        if (RandomEngine.chance(0.5)) {
          const offender = RandomEngine.pickOne(defendingTeam.players);
          events.push({
            minute,
            type: MatchEventType.YELLOW_CARD,
            description: `Cartão Amarelo para ${offender.name}`,
            teamId: defendingTeam.id,
            playerId: offender.id,
          });
        }
      }
    }

    return {
      homeScore,
      awayScore,
      events,
      stats: {
        homePossession,
        awayPossession: 100 - homePossession,
        homeShots,
        awayShots,
      },
    };
  }

  private static calculateTeamStrength(team: SimTeam): number {
    if (team.players.length === 0) return 50;

    const totalOverall = team.players.reduce((sum, p) => sum + p.overall, 0);
    return totalOverall / team.players.length;
  }

  private static selectScorer(players: SimPlayer[]): SimPlayer {
    const attackers = players.filter((p) => p.position === Position.FW);
    const midfielders = players.filter((p) => p.position === Position.MF);

    if (attackers.length > 0 && RandomEngine.chance(60)) {
      return RandomEngine.pickOne(attackers);
    }
    if (midfielders.length > 0 && RandomEngine.chance(30)) {
      return RandomEngine.pickOne(midfielders);
    }
    return RandomEngine.pickOne(players);
  }
}
