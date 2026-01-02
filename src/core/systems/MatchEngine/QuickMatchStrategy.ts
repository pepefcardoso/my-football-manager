import { v4 as uuidv4 } from "uuid";
import {
  IMatchSimulationStrategy,
  MatchEngineResult,
  TeamMatchContext,
} from "./types";
import { Match, MatchEvent, PlayerMatchStats } from "../../models/match";
import { rng } from "../../utils/generators";

export class QuickMatchStrategy implements IMatchSimulationStrategy {
  simulate(
    match: Match,
    home: TeamMatchContext,
    away: TeamMatchContext
  ): MatchEngineResult {
    const homeStrength = this.calculateTeamStrength(home.startingXI);
    const awayStrength = this.calculateTeamStrength(away.startingXI);
    const homeAdvantage = 1.05;
    const finalHomeStrength = homeStrength * homeAdvantage;
    const diff = finalHomeStrength - awayStrength;
    let homeGoals = Math.max(0, Math.floor(rng.normal(1.5 + diff / 20, 1)));
    let awayGoals = Math.max(0, Math.floor(rng.normal(1.0 - diff / 20, 1)));

    const events: MatchEvent[] = [];

    for (let i = 0; i < homeGoals; i++) {
      events.push(
        this.createGoalEvent(
          match.id,
          home,
          away,
          (i + 1) * 10 + rng.range(0, 10)
        )
      );
    }

    for (let i = 0; i < awayGoals; i++) {
      events.push(
        this.createGoalEvent(
          match.id,
          away,
          home,
          (i + 1) * 15 + rng.range(0, 10)
        )
      );
    }

    events.sort((a, b) => a.minute - b.minute);

    const playerStats: PlayerMatchStats[] = [
      ...this.generatePlayerStats(match.id, home, homeGoals > awayGoals),
      ...this.generatePlayerStats(match.id, away, awayGoals > homeGoals),
    ];

    return {
      matchId: match.id,
      homeScore: homeGoals,
      awayScore: awayGoals,
      stats: {
        homePossession: 50 + diff / 2,
        awayPossession: 50 - diff / 2,
      },
      events,
      playerStats,
    };
  }

  private calculateTeamStrength(players: any[]): number {
    if (!players.length) return 0;

    return (
      players.reduce((acc, p) => acc + (p.overall || 70), 0) / players.length
    );
  }

  private createGoalEvent(
    matchId: string,
    scoringTeam: TeamMatchContext,
    sufferingTeam: TeamMatchContext,
    minute: number
  ): MatchEvent {
    const scorer = rng.pick(scoringTeam.startingXI);

    return {
      id: uuidv4(),
      matchId: matchId,
      period: minute <= 45 ? "1H" : "2H",
      minute: Math.min(90, minute),
      extraMinute: 0,
      description: `Gol de ${scorer.name}!`,
      type: "GOAL",
      clubId: scoringTeam.clubId,
      playerId: scorer.id,
      targetPlayerId: scorer.name,
      createdAt: Date.now(),
    };
  }

  private generatePlayerStats(
    matchId: string,
    team: TeamMatchContext,
    won: boolean
  ): PlayerMatchStats[] {
    return team.startingXI.map((player) => ({
      id: uuidv4(),
      matchId: matchId,
      playerId: player.id,
      clubId: team.clubId,
      isStarter: true,
      positionPlayedId: player.primaryPositionId,
      minutesPlayed: 90,
      rating: rng.range(60, won ? 90 : 80) / 10,
      goals: 0, // TODO: cruzar com os eventos
      assists: 0,
      shotsOnTarget: rng.range(0, 3),
      shotsOffTarget: rng.range(0, 2),
      foulsCommitted: rng.range(0, 2),
      foulsSuffered: rng.range(0, 2),
      yellowCards: 0,
      redCard: false,
      crosses: 0,
      saves: 0,
      wasMvp: false,
    }));
  }
}
