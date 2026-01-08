import { v4 as uuidv4 } from "uuid";
import {
  IMatchSimulationStrategy,
  MatchEngineResult,
  TeamMatchContext,
} from "./types";
import { Match, PlayerMatchStats } from "../../models/match";
import { Player } from "../../models/people";
import { rng } from "../../utils/generators";
import { MATCH_CONFIG } from "../../constants/matchEngine";
import { SimulationContext } from "./interfaces";
import { CommandFactory } from "./CommandFactory";

export class DetailedMatchStrategy implements IMatchSimulationStrategy {
  simulate(
    match: Match,
    home: TeamMatchContext,
    away: TeamMatchContext
  ): MatchEngineResult {
    const ctx: SimulationContext = this.createContext(match, home, away);

    const stoppageH1 = rng.range(
      MATCH_CONFIG.STOPPAGE_TIME.MIN_H1,
      MATCH_CONFIG.STOPPAGE_TIME.MAX_H1
    );
    this.runPeriod(ctx, 1, 45, stoppageH1, "1H");

    const stoppageH2 = rng.range(
      MATCH_CONFIG.STOPPAGE_TIME.MIN_H2,
      MATCH_CONFIG.STOPPAGE_TIME.MAX_H2
    );
    this.runPeriod(ctx, 46, 90, stoppageH2, "2H");

    this.finalizeStats(ctx);

    return this.buildResult(match, ctx);
  }

  private createContext(
    match: Match,
    home: TeamMatchContext,
    away: TeamMatchContext
  ): SimulationContext {
    const statsMap: Record<string, PlayerMatchStats> = {};

    const initStats = (p: Player, clubId: string) => {
      statsMap[p.id] = {
        id: uuidv4(),
        matchId: match.id,
        playerId: p.id,
        clubId,
        isStarter: true,
        positionPlayedId: p.primaryPositionId,
        minutesPlayed: 90,
        rating: 6.0,
        goals: 0,
        assists: 0,
        shotsOnTarget: 0,
        shotsOffTarget: 0,
        foulsCommitted: 0,
        foulsSuffered: 0,
        yellowCards: 0,
        redCard: false,
        crosses: 0,
        saves: 0,
        wasMvp: false,
      };
    };

    home.startingXI.forEach((p) => initStats(p, home.clubId));
    away.startingXI.forEach((p) => initStats(p, away.clubId));

    return {
      matchId: match.id,
      home,
      away,
      currentMinute: 0,
      extraMinute: 0,
      period: "1H",
      momentum: 50,
      events: [],
      playerStats: statsMap,
      hasPossession: home,
      defendingTeam: away,
    };
  }

  private runPeriod(
    ctx: SimulationContext,
    start: number,
    end: number,
    extra: number,
    periodLabel: "1H" | "2H"
  ) {
    ctx.period = periodLabel;
    const totalMinutes = end - start + 1 + extra;

    for (let i = 0; i < totalMinutes; i++) {
      const absoluteMinute = start + i;
      ctx.currentMinute = absoluteMinute > end ? end : absoluteMinute;
      ctx.extraMinute = absoluteMinute > end ? absoluteMinute - end : 0;

      this.updatePossession(ctx);

      const command = CommandFactory.getNextCommand(ctx);
      command.execute(ctx);
    }
  }

  private updatePossession(ctx: SimulationContext) {
    const homePassing = this.getSectorAvg(ctx.home.startingXI, "passing");
    const awayPassing = this.getSectorAvg(ctx.away.startingXI, "passing");

    const momentumFactor = (ctx.momentum - 50) * 0.5;

    const homeChance = 50 + (homePassing - awayPassing) + momentumFactor;

    if (rng.range(0, 100) < homeChance) {
      ctx.hasPossession = ctx.home;
      ctx.defendingTeam = ctx.away;
    } else {
      ctx.hasPossession = ctx.away;
      ctx.defendingTeam = ctx.home;
    }
  }

  private finalizeStats(ctx: SimulationContext) {
    const allStats = Object.values(ctx.playerStats);

    let bestRating = 0;
    let mvpId = "";

    allStats.forEach((stat) => {
      stat.rating = Math.max(3, Math.min(10, stat.rating + rng.normal(0, 0.3)));
      if (stat.rating > bestRating) {
        bestRating = stat.rating;
        mvpId = stat.id;
      }
    });

    if (mvpId && ctx.playerStats[mvpId]) {
      ctx.playerStats[mvpId].wasMvp = true;
    }
  }

  private buildResult(match: Match, ctx: SimulationContext): MatchEngineResult {
    const homeGoals = ctx.events.filter(
      (e) => e.type === "GOAL" && e.clubId === ctx.home.clubId
    ).length;
    const awayGoals = ctx.events.filter(
      (e) => e.type === "GOAL" && e.clubId === ctx.away.clubId
    ).length;

    return {
      matchId: match.id,
      homeScore: homeGoals,
      awayScore: awayGoals,
      stats: {
        homePossession: Math.round(ctx.momentum),
        awayPossession: 100 - Math.round(ctx.momentum),
        homeShots: 0,
        awayShots: 0,
        homeShotsOnTarget: 0,
        awayShotsOnTarget: 0,
        homeFouls: 0,
        awayFouls: 0,
        homeCorners: 0,
        awayCorners: 0,
      },
      events: ctx.events,
      playerStats: Object.values(ctx.playerStats),
    };
  }

  private getSectorAvg(players: Player[], attr: keyof Player): number {
    if (players.length === 0) return 50;

    const sum = players.reduce((acc, player) => {
      const value = player[attr];
      return acc + (typeof value === "number" ? value : 0);
    }, 0);

    return sum / players.length;
  }
}
