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
  const age = isYouth ? randomInt(15, 17) : randomInt(19, 34);

  const getAttribute = (min: number, max: number) => {
    if (isYouth) {
      const youthMin = Math.max(20, min - 15);
      const youthMax = Math.min(68, max - 15);
      return randomInt(youthMin, youthMax);
    }
    return randomInt(min, max);
  };

  let finishing = getAttribute(40, 80);
  let passing = getAttribute(40, 80);
  let dribbling = getAttribute(40, 80);
  let defending = getAttribute(40, 80);
  let physical = getAttribute(50, 85);
  let pace = getAttribute(50, 85);
  let shooting = getAttribute(40, 80);

  if (position === Position.GK) {
    defending = getAttribute(60, 90);
    finishing = getAttribute(10, 30);
    dribbling = getAttribute(20, 50);
    passing = getAttribute(40, 70);
  } else if (position === Position.DF) {
    defending = getAttribute(65, 90);
    physical = getAttribute(65, 90);
    finishing = getAttribute(20, 50);
  } else if (position === Position.MF) {
    passing = getAttribute(65, 90);
    dribbling = getAttribute(60, 85);
  } else if (position === Position.FW) {
    finishing = getAttribute(65, 90);
    shooting = getAttribute(65, 90);
    pace = getAttribute(65, 90);
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
    ? Math.min(99, overall + randomInt(5, 20))
    : Math.min(99, overall + randomInt(0, 5));

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
    moral: isYouth ? 50 : randomInt(70, 100),
    energy: 100,
    fitness: 100,
    form: 50,
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
