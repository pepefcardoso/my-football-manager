import { AttributeCalculator } from "../../engine/AttributeCalculator";
import { FIRST_NAMES, LAST_NAMES } from "./data";
import {
  Position,
  StaffRole,
  TransferStrategy,
  InterestLevel,
} from "../../domain/enums";
import type { ScoutingSlot } from "../../domain/models";

export function random<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generatePlayer(
  teamId: number,
  position: string,
  isYouth = false
) {
  const age = isYouth ? randomInt(16, 19) : randomInt(18, 34);

  let finishing = randomInt(40, 80);
  let passing = randomInt(40, 80);
  let dribbling = randomInt(40, 80);
  let defending = randomInt(40, 80);
  let physical = randomInt(50, 85);
  let pace = randomInt(50, 85);
  let shooting = randomInt(40, 80);

  if (position === Position.GK) {
    defending = randomInt(60, 90);
    finishing = randomInt(10, 30);
    dribbling = randomInt(20, 50);
    passing = randomInt(40, 70);
  } else if (position === Position.DF) {
    defending = randomInt(65, 90);
    physical = randomInt(65, 90);
    finishing = randomInt(20, 50);
  } else if (position === Position.MF) {
    passing = randomInt(65, 90);
    dribbling = randomInt(60, 85);
  } else if (position === Position.FW) {
    finishing = randomInt(65, 90);
    shooting = randomInt(65, 90);
    pace = randomInt(65, 90);
  }

  const overall = AttributeCalculator.calculateOverall(position as Position, {
    finishing,
    passing,
    dribbling,
    defending,
    physical,
    pace,
    shooting,
  });

  const potential = isYouth
    ? Math.min(99, overall + randomInt(15, 30))
    : Math.min(99, overall + randomInt(0, 10));

  return {
    teamId,
    firstName: random(FIRST_NAMES),
    lastName: random(LAST_NAMES),
    age,
    nationality: "BRA",
    position,
    preferredFoot: Math.random() > 0.3 ? "right" : "left",
    overall,
    potential,
    finishing,
    passing,
    dribbling,
    defending,
    physical,
    pace,
    shooting,
    moral: randomInt(70, 100),
    energy: randomInt(90, 100),
    fitness: randomInt(80, 100),
    form: randomInt(40, 70),
    isYouth,
    isInjured: false,
    isCaptain: false,
    suspensionGamesRemaining: 0,
    injuryDaysRemaining: 0,
  };
}

export function generateStaffMember(teamId: number, role: StaffRole) {
  return {
    teamId,
    firstName: random(FIRST_NAMES),
    lastName: random(LAST_NAMES),
    age: randomInt(35, 65),
    nationality: "BRA",
    role,
    overall: randomInt(50, 90),
    salary: randomInt(15000, 80000),
    contractEnd: `${2025 + randomInt(1, 3)}-12-31`,
    specialization:
      role === StaffRole.SCOUT
        ? random(["south_america", "europe", "youth"])
        : null,
  };
}

export function determineTransferStrategy(
  reputation: number,
  budget: number
): TransferStrategy {
  if (reputation > 8500 && budget > 100_000_000)
    return TransferStrategy.AGGRESSIVE;
  if (reputation < 6000) return TransferStrategy.SELLING_CLUB;
  if (Math.random() > 0.7) return TransferStrategy.YOUTH_FOCUSED;
  return TransferStrategy.BALANCED;
}

export function generateDefaultScoutingSlots(): ScoutingSlot[] {
  return [1, 2, 3].map((num) => ({
    slotNumber: num as 1 | 2 | 3,
    isActive: false,
    filters: {},
    stats: {
      playersFound: 0,
      lastRunDate: null,
    },
  }));
}

export function generateClubInterest(
  teamId: number,
  playerId: number,
  priority: number = 1
) {
  const levels = [
    InterestLevel.OBSERVING,
    InterestLevel.INTERESTED,
    InterestLevel.HIGH_PRIORITY,
  ];
  return {
    teamId,
    playerId,
    interestLevel: random(levels),
    priority,
    maxFeeWillingToPay: null,
    dateAdded: new Date().toISOString().split("T")[0],
  };
}
