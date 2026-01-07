import { v4 as uuidv4 } from "uuid";
import { Club, ClubFinances, ClubInfra } from "../models/club";
import { Player } from "../models/people";
import { Foot, ID } from "../models/types";
import { PlayerCalculations } from "../models/player";

class SeededRNG {
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
  }

  public setSeed(seed: number) {
    this.seed = seed;
  }

  next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(array: T[]): T {
    return array[this.range(0, array.length - 1)];
  }

  normal(mean: number, stdDev: number): number {
    const u = 1 - this.next();
    const v = 1 - this.next();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return Math.round(z * stdDev + mean);
  }
}

export const rng = new SeededRNG();

const NAMES = [
  "Silva",
  "Santos",
  "Oliveira",
  "Souza",
  "Rodrigues",
  "Ferreira",
  "Alves",
  "Pereira",
  "Lima",
  "Gomes",
  "Costa",
  "Ribeiro",
  "Martins",
];
const FIRST_NAMES = [
  "João",
  "Pedro",
  "Lucas",
  "Matheus",
  "Gabriel",
  "Rafael",
  "Gustavo",
  "Felipe",
  "Bruno",
  "Thiago",
  "Arthur",
  "Nicolas",
  "Davi",
];

export class PlayerFactory {
  static createPlayer(
    clubId: ID,
    nationId: ID,
    position: "GK" | "DEF" | "MID" | "ATT",
    targetOverall: number = 70
  ): Player {
    const id = uuidv4();
    const age = rng.range(16, 36);
    const isYoung = age < 23;
    const potentialBonus = isYoung ? rng.range(5, 20) : rng.range(0, 3);
    const generateAttr = (bonus: number = 0) => {
      const val = rng.normal(targetOverall + bonus, 5);
      return Math.max(1, Math.min(99, val));
    };

    const isGK = position === "GK";
    const isAtt = position === "ATT";
    const isDef = position === "DEF";

    const player: Player = {
      id,
      name: `${rng.pick(FIRST_NAMES)} ${rng.pick(NAMES)}`,
      nickname: "",
      nationId,
      birthDate: Date.now() - age * 365 * 24 * 60 * 60 * 1000,
      primaryPositionId: position,
      preferredFoot: rng.next() > 0.8 ? "LEFT" : ("RIGHT" as Foot),
      crossing: generateAttr(isAtt ? 5 : 0),
      finishing: generateAttr(isAtt ? 10 : -10),
      passing: generateAttr(isDef ? -5 : 5),
      technique: generateAttr(0),
      defending: generateAttr(isDef ? 10 : -20),
      gkReflexes: isGK ? generateAttr(10) : 5,
      gkRushingOut: isGK ? generateAttr(10) : 5,
      gkDistribution: isGK ? generateAttr(5) : 5,
      speed: generateAttr(isYoung ? 5 : -5),
      force: generateAttr(0),
      stamina: generateAttr(-5 + (age > 30 ? -10 : 0)),
      intelligence: generateAttr(age > 28 ? 10 : -5),
      determination: generateAttr(0),
      potential: 0,
      overall: 0,
      proneToInjury: rng.range(1, 20),
      marketValue: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const currentAbility = PlayerCalculations.calculateOverall(player);
    player.overall = currentAbility;
    player.potential = Math.min(99, currentAbility + potentialBonus);
    player.marketValue = this.calculateValue(
      currentAbility,
      age,
      player.potential
    );

    return player;
  }

  private static calculateValue(
    overall: number,
    age: number,
    potential: number
  ): number {
    let baseValue = 0;
    if (overall < 60) baseValue = 50_000;
    else if (overall < 70) baseValue = 500_000;
    else if (overall < 75) baseValue = 2_000_000;
    else if (overall < 80) baseValue = 8_000_000;
    else if (overall < 85) baseValue = 20_000_000;
    else baseValue = 60_000_000;

    const ageMultiplier = age < 24 ? 1.5 : age > 32 ? 0.5 : 1.0;
    const potentialMultiplier = potential - overall > 10 ? 1.3 : 1.0;

    return Math.floor(baseValue * ageMultiplier * potentialMultiplier);
  }

  static calculateWage(overall: number): number {
    if (overall < 60) return rng.range(1_000, 20_000);
    if (overall < 70) return rng.range(30_000, 80_000);
    if (overall < 75) return rng.range(80_000, 150_000);
    if (overall < 80) return rng.range(150_000, 300_000);
    if (overall < 85) return rng.range(300_000, 600_000);
    if (overall < 90) return rng.range(600_000, 1_200_000);
    return rng.range(1_200_000, 2_500_000);
  }
}

export interface ClubBundle {
  club: Club;
  infra: ClubInfra;
  finances: ClubFinances;
  players: Player[];
}

export class ClubFactory {
  static createClub(
    name: string,
    nationId: ID,
    reputation: number,
    colors: { primary: string; secondary: string },
    badgeId: string
  ): ClubBundle {
    const clubId = uuidv4();
    const isBigClub = reputation > 7000;

    const club: Club = {
      id: clubId,
      name,
      nickname: name.substring(0, 3).toUpperCase(),
      dateFounded: Date.now() - rng.range(50, 120) * 365 * 24 * 60 * 60 * 1000,
      cityId: uuidv4(),
      nationId,
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
      badgeId: badgeId,
      kitId: "",
      fanBaseCurrent: Math.floor(reputation * rng.range(10, 50)),
      fanBaseMax: Math.floor(reputation * 60),
      fanBaseMin: Math.floor(reputation * 5),
      reputation,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const baseInfraLevel = Math.floor(reputation / 100);
    const infra: ClubInfra = {
      clubId,
      stadiumId: uuidv4(),
      reserveStadiumId: uuidv4(),
      youthAcademyLevel: Math.min(100, rng.normal(baseInfraLevel, 5)),
      trainingCenterLevel: Math.min(100, rng.normal(baseInfraLevel, 5)),
      dataAnalysisCenterLevel: Math.min(
        100,
        rng.normal(baseInfraLevel - 10, 5)
      ),
      medicalCenterLevel: Math.min(100, rng.normal(baseInfraLevel, 5)),
      administrationLevel: Math.min(100, rng.normal(baseInfraLevel, 5)),
    };

    const finances: ClubFinances = {
      clubId,
      balanceCurrent: isBigClub
        ? rng.range(10_000_000, 50_000_000)
        : rng.range(100_000, 2_000_000),
      debtHistorical: isBigClub ? rng.range(0, 100_000_000) : 0,
      debtInterestRate: 0.01,
      accumulatedManagementBalance: 0,
      monthlyMembershipRevenue: Math.floor(
        club.fanBaseCurrent * rng.range(20, 50)
      ),
    };

    const players: Player[] = [];
    const targetOvr = Math.floor(reputation / 100);

    for (let i = 0; i < 3; i++)
      players.push(
        PlayerFactory.createPlayer(clubId, nationId, "GK", targetOvr)
      );
    for (let i = 0; i < 8; i++)
      players.push(
        PlayerFactory.createPlayer(clubId, nationId, "DEF", targetOvr)
      );
    for (let i = 0; i < 8; i++)
      players.push(
        PlayerFactory.createPlayer(clubId, nationId, "MID", targetOvr)
      );
    for (let i = 0; i < 5; i++)
      players.push(
        PlayerFactory.createPlayer(clubId, nationId, "ATT", targetOvr)
      );

    return { club, infra, finances, players };
  }
}
