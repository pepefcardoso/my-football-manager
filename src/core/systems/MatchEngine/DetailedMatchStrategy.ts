import { v4 as uuidv4 } from "uuid";
import {
  IMatchSimulationStrategy,
  MatchEngineResult,
  TeamMatchContext,
} from "./types";
import { Match, MatchEvent, PlayerMatchStats } from "../../models/match";
import { Player } from "../../models/people";
import { rng } from "../../utils/generators";
import { MATCH_CONFIG } from "../../constants/matchEngine";

export class DetailedMatchStrategy implements IMatchSimulationStrategy {
  private events: MatchEvent[] = [];
  private playerStatsMap: Record<string, PlayerMatchStats> = {};
  private momentum = 50;

  simulate(
    match: Match,
    home: TeamMatchContext,
    away: TeamMatchContext
  ): MatchEngineResult {
    this.resetState();
    this.initializePlayerStats(match.id, home, away);

    const stoppageTimeH1 = rng.range(
      MATCH_CONFIG.STOPPAGE_TIME.MIN_H1,
      MATCH_CONFIG.STOPPAGE_TIME.MAX_H1
    );
    this.simulatePeriod(1, 45, stoppageTimeH1, match.id, home, away, "1H");

    const stoppageTimeH2 = rng.range(
      MATCH_CONFIG.STOPPAGE_TIME.MIN_H2,
      MATCH_CONFIG.STOPPAGE_TIME.MAX_H2
    );
    this.simulatePeriod(46, 90, stoppageTimeH2, match.id, home, away, "2H");

    this.calculateFinalRatings(home, away);
    this.determineMVP();

    return this.buildResult(match.id, home.clubId, away.clubId);
  }

  private resetState() {
    this.events = [];
    this.playerStatsMap = {};
    this.momentum = 50;
  }

  private simulatePeriod(
    startMinute: number,
    endMinute: number,
    extraTime: number,
    matchId: string,
    home: TeamMatchContext,
    away: TeamMatchContext,
    periodLabel: "1H" | "2H"
  ) {
    const totalMinutes = endMinute - startMinute + 1 + extraTime;

    for (let i = 0; i < totalMinutes; i++) {
      let currentMinute = startMinute + i;
      let extraMinute = 0;

      if (currentMinute > endMinute) {
        extraMinute = currentMinute - endMinute;
        currentMinute = endMinute;
      }

      this.processMinute(
        matchId,
        home,
        away,
        currentMinute,
        extraMinute,
        periodLabel
      );
    }
  }

  private processMinute(
    matchId: string,
    home: TeamMatchContext,
    away: TeamMatchContext,
    minute: number,
    extraMinute: number,
    period: "1H" | "2H"
  ) {
    const homeMid = this.getSectorAverage(home.startingXI, "MID", "passing");
    const awayMid = this.getSectorAverage(away.startingXI, "MID", "passing");

    const momentumFactor = (this.momentum - 50) * 0.5;
    const homeChance = 50 + (homeMid - awayMid) + momentumFactor;

    const hasPossession = rng.range(0, 100) < homeChance ? home : away;
    const defense = hasPossession === home ? away : home;

    if (hasPossession === home)
      this.momentum = Math.min(100, this.momentum + 0.5);
    else this.momentum = Math.max(0, this.momentum - 0.5);

    const actionRoll = rng.range(0, 1000) / 10;

    if (actionRoll < MATCH_CONFIG.PROBABILITIES.INJURY_BASE) {
      this.handleInjury(matchId, hasPossession, minute, extraMinute, period);
    } else if (actionRoll < MATCH_CONFIG.PROBABILITIES.FOUL_BASE) {
      this.handleFoul(
        matchId,
        defense,
        hasPossession,
        minute,
        extraMinute,
        period
      );
    } else if (actionRoll < MATCH_CONFIG.PROBABILITIES.ATTACK_BASE) {
      this.handleAttackingChance(
        matchId,
        hasPossession,
        defense,
        minute,
        extraMinute,
        period,
        home.clubId
      );
    }
  }

  private handleAttackingChance(
    matchId: string,
    attTeam: TeamMatchContext,
    defTeam: TeamMatchContext,
    minute: number,
    extraMinute: number,
    period: "1H" | "2H",
    homeClubId: string
  ) {
    const attacker = rng.pick(attTeam.startingXI); // TODO: Ponderar escolha baseada na posição (ATT/MID > DEF) e Táticas
    const keeper =
      defTeam.startingXI.find((p) => p.primaryPositionId === "GK") ||
      defTeam.startingXI[0];

    const finishAttr = (attacker.finishing + attacker.technique) / 2;
    const saveAttr = (keeper.gkReflexes + keeper.gkDistribution) / 2;
    // TODO: Complexidade de fórmula: incluir Distância, Angulo, Stamina e Moral

    const goalChance = finishAttr - saveAttr + rng.range(-20, 20);

    if (goalChance > 15) {
      // TODO: Mover threshold (15) para MATCH_CONFIG
      this.createEvent(
        matchId,
        "GOAL",
        attTeam.clubId,
        attacker.id,
        `Gol de ${attacker.name}!`,
        minute,
        extraMinute,
        period
      );
      this.updateStats(attacker.id, "goals", 1);
      this.updateStats(attacker.id, "shotsOnTarget", 1);
      this.updateRating(attacker.id, MATCH_CONFIG.RATING_WEIGHTS.GOAL);

      if (rng.range(0, 10) > 3) {
        // TODO: Chance fixa de 70%? Tornar dinâmico baseado em 'passing' e 'vision'
        const assister = rng.pick(
          attTeam.startingXI.filter((p) => p.id !== attacker.id)
        );
        this.updateStats(assister.id, "assists", 1);
        this.updateRating(assister.id, MATCH_CONFIG.RATING_WEIGHTS.ASSIST);
      }

      this.momentum = attTeam.clubId === homeClubId ? 40 : 60;
    } else if (goalChance > -10) {
      // TODO: Mover threshold (-10) para MATCH_CONFIG
      this.createEvent(
        matchId,
        "CHANCE",
        attTeam.clubId,
        attacker.id,
        `Defesaça de ${keeper.name} em chute de ${attacker.name}!`,
        minute,
        extraMinute,
        period
      );
      this.updateStats(attacker.id, "shotsOnTarget", 1);
      this.updateRating(
        attacker.id,
        MATCH_CONFIG.RATING_WEIGHTS.SHOT_ON_TARGET
      );
      this.updateStats(keeper.id, "saves", 1);
      this.updateRating(keeper.id, MATCH_CONFIG.RATING_WEIGHTS.SAVE);
    } else {
      this.updateStats(attacker.id, "shotsOffTarget", 1);
      this.updateRating(attacker.id, MATCH_CONFIG.RATING_WEIGHTS.ERROR);
    }
  }

  private handleFoul(
    matchId: string,
    offenderTeam: TeamMatchContext,
    victimTeam: TeamMatchContext,
    minute: number,
    extraMinute: number,
    period: "1H" | "2H"
  ) {
    const offender = rng.pick(offenderTeam.startingXI);
    const victim = rng.pick(victimTeam.startingXI);
    // TODO: Matchups realistas (ex: Lateral vs Ponta, Zagueiro vs Atacante)

    this.updateStats(offender.id, "foulsCommitted", 1);
    this.updateStats(victim.id, "foulsSuffered", 1);

    const cardRoll = rng.range(0, 100);
    if (cardRoll < 10) {
      this.createEvent(
        matchId,
        "CARD_YELLOW",
        offenderTeam.clubId,
        offender.id,
        `Cartão Amarelo para ${offender.name}`,
        minute,
        extraMinute,
        period
      );
      this.updateStats(offender.id, "yellowCards", 1);
      this.updateRating(offender.id, MATCH_CONFIG.RATING_WEIGHTS.YELLOW_CARD);
    } else if (cardRoll < 1) {
      this.createEvent(
        matchId,
        "CARD_RED",
        offenderTeam.clubId,
        offender.id,
        `Vermelho direto para ${offender.name}!`,
        minute,
        extraMinute,
        period
      );
      this.updateStats(offender.id, "redCard", true);
      this.updateRating(offender.id, MATCH_CONFIG.RATING_WEIGHTS.RED_CARD);
    }
  }

  private handleInjury(
    matchId: string,
    team: TeamMatchContext,
    minute: number,
    extraMinute: number,
    period: "1H" | "2H"
  ) {
    const player = rng.pick(team.startingXI);
    // TODO: CRÍTICO - Implementar lógica de substituição forçada (remover do XI, colocar banco)
    // TODO: Se não houver substituições, time joga com 10 (reduzir atributos do time)
    this.createEvent(
      matchId,
      "INJURY",
      team.clubId,
      player.id,
      `${player.name} sentiu uma lesão e precisará sair.`,
      minute,
      extraMinute,
      period
    );
  }

  private createEvent(
    matchId: string,
    type: string,
    clubId: string,
    playerId: string,
    description: string,
    minute: number,
    extraMinute: number,
    period: "1H" | "2H"
  ) {
    this.events.push({
      id: uuidv4(),
      matchId,
      period,
      minute,
      extraMinute,
      type: type as any,
      clubId,
      playerId,
      description,
      targetPlayerId: null,
      createdAt: Date.now(),
    });
  }

  private initializePlayerStats(
    matchId: string,
    home: TeamMatchContext,
    away: TeamMatchContext
  ) {
    const initPlayer = (p: Player, clubId: string) => {
      this.playerStatsMap[p.id] = {
        id: uuidv4(),
        matchId,
        playerId: p.id,
        clubId,
        isStarter: true,
        positionPlayedId: p.primaryPositionId,
        minutesPlayed: 90,// TODO: Ajustar para minutos reais caso haja substituição ou expulsão
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
    home.startingXI.forEach((p) => initPlayer(p, home.clubId));
    away.startingXI.forEach((p) => initPlayer(p, away.clubId));
  }

  private calculateFinalRatings(
    home: TeamMatchContext,
    away: TeamMatchContext
  ) {
    const processTeam = (team: TeamMatchContext, goalsConceded: number) => {
      team.startingXI.forEach((p) => {
        const stats = this.playerStatsMap[p.id];
        if (
          goalsConceded === 0 &&
          (p.primaryPositionId === "GK" || p.primaryPositionId === "DEF")
        ) {
          stats.rating += MATCH_CONFIG.RATING_WEIGHTS.CLEANSHEET;
        }
        stats.rating = Math.max(3.0, Math.min(10.0, stats.rating));
        stats.rating += rng.normal(0, 0.2);
      });
    };
    processTeam(home, this.countGoals(away.clubId));
    processTeam(away, this.countGoals(home.clubId));
  }

  private determineMVP() {
    let bestRating = -1;
    let mvpId = "";
    Object.values(this.playerStatsMap).forEach((stat) => {
      if (stat.rating > bestRating) {
        bestRating = stat.rating;
        mvpId = stat.id;
      }
    });
    if (mvpId && this.playerStatsMap[mvpId]) {
      this.playerStatsMap[mvpId].wasMvp = true;
    }
  }

  private buildResult(
    matchId: string,
    homeId: string,
    awayId: string
  ): MatchEngineResult {
    const homeGoals = this.countGoals(homeId);
    const awayGoals = this.countGoals(awayId);

    return {
      matchId,
      homeScore: homeGoals,
      awayScore: awayGoals,
      stats: {
        homePossession: 50,// TODO: Calcular posse real baseada no número de ticks de 'hasPossession'
        awayPossession: 50,
        homeShots:
          this.sumStats(homeId, "shotsOffTarget") +
          this.sumStats(homeId, "shotsOnTarget"),
        awayShots:
          this.sumStats(awayId, "shotsOffTarget") +
          this.sumStats(awayId, "shotsOnTarget"),
        homeShotsOnTarget: this.sumStats(homeId, "shotsOnTarget"),
        awayShotsOnTarget: this.sumStats(awayId, "shotsOnTarget"),
        homeFouls: this.sumStats(homeId, "foulsCommitted"),
        awayFouls: this.sumStats(awayId, "foulsCommitted"),
        homeCorners: Math.floor(rng.range(2, 8)),// TODO: Gerar escanteios dinamicamente após eventos de 'DEFESA'
        awayCorners: Math.floor(rng.range(2, 8)),
      },
      events: this.events.sort((a, b) => {
        if (a.minute !== b.minute) return a.minute - b.minute;
        return a.extraMinute - b.extraMinute;
      }),
      playerStats: Object.values(this.playerStatsMap),
    };
  }

  private updateStats(
    playerId: string,
    field: keyof PlayerMatchStats,
    value: any
  ) {
    if (this.playerStatsMap[playerId]) {
      const target = this.playerStatsMap[playerId] as any;

      if (typeof target[field] === "number") {
        target[field] += value;
      } else {
        target[field] = value;
      }
    }
  }

  private updateRating(playerId: string, value: number) {
    if (this.playerStatsMap[playerId]) {
      this.playerStatsMap[playerId].rating += value;
    }
  }

  private countGoals(clubId: string): number {
    return this.events.filter((e) => e.type === "GOAL" && e.clubId === clubId)
      .length;
  }

  private sumStats(clubId: string, field: keyof PlayerMatchStats): number {
    return Object.values(this.playerStatsMap)
      .filter((s) => s.clubId === clubId)
      .reduce((acc, s) => acc + (s[field] as number), 0);
  }

  private getSectorAverage(
    players: Player[],
    sector: string,
    attr: keyof Player
  ): number {
    const sectorPlayers = players.filter((p) => p.primaryPositionId === sector);
    if (!sectorPlayers.length) return 70;// TODO: Este 70 é arbitrário. Calcular média geral do time ou penalizar por falta de setor.
    return (
      sectorPlayers.reduce((acc, p) => acc + (p[attr] as number), 0) /
      sectorPlayers.length
    );
  }
}
