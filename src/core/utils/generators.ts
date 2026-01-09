import { v4 as uuidv4 } from "uuid";
import { Club, ClubFinances, ClubInfra } from "../models/club";
import { Player } from "../models/people";
import { Foot, ID } from "../models/types";
import { PlayerCalculations } from "../models/player";

export interface IRNG {
  setSeed(seed: number): void;
  next(): number;
  range(min: number, max: number): number;
  pick<T>(array: T[]): T;
  normal(mean: number, stdDev: number): number;
}

export class SeededRNG implements IRNG {
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
  }

  public setSeed(seed: number) {
    this.seed = seed;
  }

  public next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  public range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  public pick<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error("Cannot pick from an empty array");
    }
    return array[this.range(0, array.length - 1)];
  }

  public normal(mean: number, stdDev: number): number {
    const u = 1 - this.next();
    const v = 1 - this.next();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return Math.round(z * stdDev + mean);
  }
}

class GlobalRNG implements IRNG {
  private static instance: IRNG;

  constructor() {
    if (!GlobalRNG.instance) {
      GlobalRNG.instance = new SeededRNG(Date.now());
    }
  }

  public static setImplementation(implementation: IRNG) {
    GlobalRNG.instance = implementation;
  }

  public static reset() {
    GlobalRNG.instance = new SeededRNG(Date.now());
  }

  public setSeed(seed: number) {
    GlobalRNG.instance.setSeed(seed);
  }
  public next() {
    return GlobalRNG.instance.next();
  }
  public range(min: number, max: number) {
    return GlobalRNG.instance.range(min, max);
  }
  public pick<T>(array: T[]) {
    return GlobalRNG.instance.pick(array);
  }
  public normal(mean: number, stdDev: number) {
    return GlobalRNG.instance.normal(mean, stdDev);
  }
}

export const rng = new GlobalRNG();

export const setGlobalRNG = (newRng: IRNG) =>
  GlobalRNG.setImplementation(newRng);

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
    targetOverall: number = 70,
    rngInstance: IRNG = rng
  ): Player {
    const id = uuidv4();
    const age = rngInstance.range(16, 36);
    const isYoung = age < 23;
    const potentialBonus = isYoung
      ? rngInstance.range(5, 20)
      : rngInstance.range(0, 3);

    const generateAttr = (bonus: number = 0) => {
      const val = rngInstance.normal(targetOverall + bonus, 5);
      return Math.max(1, Math.min(99, val));
    };

    const isGK = position === "GK";
    const isAtt = position === "ATT";
    const isDef = position === "DEF";

    const player: Player = {
      id,
      name: `${rngInstance.pick(FIRST_NAMES)} ${rngInstance.pick(NAMES)}`,
      nickname: "",
      nationId,
      birthDate: Date.now() - age * 365 * 24 * 60 * 60 * 1000,
      primaryPositionId: position,
      preferredFoot: rngInstance.next() > 0.8 ? "LEFT" : ("RIGHT" as Foot),
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
      proneToInjury: rngInstance.range(1, 20),
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

  static calculateWage(overall: number, rngInstance: IRNG = rng): number {
    if (overall < 60) return rngInstance.range(1_000, 20_000);
    if (overall < 70) return rngInstance.range(30_000, 80_000);
    if (overall < 75) return rngInstance.range(80_000, 150_000);
    if (overall < 80) return rngInstance.range(150_000, 300_000);
    if (overall < 85) return rngInstance.range(300_000, 600_000);
    if (overall < 90) return rngInstance.range(600_000, 1_200_000);
    return rngInstance.range(1_200_000, 2_500_000);
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
    badgeId: string,
    rngInstance: IRNG = rng
  ): ClubBundle {
    const clubId = uuidv4();
    const isBigClub = reputation > 7000;

    const club: Club = {
      id: clubId,
      name,
      nickname: name.substring(0, 3).toUpperCase(),
      dateFounded:
        Date.now() - rngInstance.range(50, 120) * 365 * 24 * 60 * 60 * 1000,
      cityId: uuidv4(),
      nationId,
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
      badgeId: badgeId,
      kitId: "",
      fanBaseCurrent: Math.floor(reputation * rngInstance.range(10, 50)),
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
      youthAcademyLevel: Math.min(100, rngInstance.normal(baseInfraLevel, 5)),
      trainingCenterLevel: Math.min(100, rngInstance.normal(baseInfraLevel, 5)),
      dataAnalysisCenterLevel: Math.min(
        100,
        rngInstance.normal(baseInfraLevel - 10, 5)
      ),
      medicalCenterLevel: Math.min(100, rngInstance.normal(baseInfraLevel, 5)),
      administrationLevel: Math.min(100, rngInstance.normal(baseInfraLevel, 5)),
    };

    const finances: ClubFinances = {
      clubId,
      balanceCurrent: isBigClub
        ? rngInstance.range(10_000_000, 50_000_000)
        : rngInstance.range(100_000, 2_000_000),
      debtHistorical: isBigClub ? rngInstance.range(0, 100_000_000) : 0,
      debtInterestRate: 0.01,
      accumulatedManagementBalance: 0,
      monthlyMembershipRevenue: Math.floor(
        club.fanBaseCurrent * rngInstance.range(20, 50)
      ),
    };

    const players: Player[] = [];
    const targetOvr = Math.floor(reputation / 100);

    for (let i = 0; i < 3; i++)
      players.push(
        PlayerFactory.createPlayer(
          clubId,
          nationId,
          "GK",
          targetOvr,
          rngInstance
        )
      );
    for (let i = 0; i < 8; i++)
      players.push(
        PlayerFactory.createPlayer(
          clubId,
          nationId,
          "DEF",
          targetOvr,
          rngInstance
        )
      );
    for (let i = 0; i < 8; i++)
      players.push(
        PlayerFactory.createPlayer(
          clubId,
          nationId,
          "MID",
          targetOvr,
          rngInstance
        )
      );
    for (let i = 0; i < 5; i++)
      players.push(
        PlayerFactory.createPlayer(
          clubId,
          nationId,
          "ATT",
          targetOvr,
          rngInstance
        )
      );

    return { club, infra, finances, players };
  }
}
