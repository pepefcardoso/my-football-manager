import { GameState } from "../models/gameState";
import { eventBus } from "../events/EventBus";
import { RECOVERY_CONSTANTS } from "../constants/recovery";

export interface RecoveryResult {
  recoveredPlayers: string[];
  logs: string[];
}

const getStaffBonus = (state: GameState, clubId: string): number => {
  const staffContracts = Object.values(state.market.staffContracts).filter(
    (c) => c.clubId === clubId && c.active
  );

  if (staffContracts.length === 0) return 0;

  let bestOverall = 0;
  staffContracts.forEach((c) => {
    const staff = state.people.staff[c.staffId];
    if (staff && staff.overall > bestOverall) bestOverall = staff.overall;
  });

  if (bestOverall >= RECOVERY_CONSTANTS.STAFF.HIGH_TIER_THRESHOLD) {
    return RECOVERY_CONSTANTS.STAFF.HIGH_TIER_BONUS;
  }
  if (bestOverall >= RECOVERY_CONSTANTS.STAFF.MID_TIER_THRESHOLD) {
    return RECOVERY_CONSTANTS.STAFF.MID_TIER_BONUS;
  }
  return 0;
};

const getInfraBonus = (state: GameState, clubId: string): number => {
  const infra = state.clubs.infras[clubId];
  if (!infra) return 0;

  if (
    infra.medicalCenterLevel >= RECOVERY_CONSTANTS.INFRA.HIGH_TIER_THRESHOLD
  ) {
    return RECOVERY_CONSTANTS.INFRA.HIGH_TIER_BONUS;
  }

  if (infra.medicalCenterLevel >= RECOVERY_CONSTANTS.INFRA.MID_TIER_THRESHOLD) {
    return RECOVERY_CONSTANTS.INFRA.MID_TIER_BONUS;
  }

  return 0;
};

const getAgeModifier = (age: number): number => {
  if (age < RECOVERY_CONSTANTS.AGE_YOUNG_THRESHOLD) {
    return RECOVERY_CONSTANTS.AGE_BONUS_MODIFIER;
  }
  if (age > RECOVERY_CONSTANTS.AGE_OLD_THRESHOLD) {
    return RECOVERY_CONSTANTS.AGE_PENALTY_MODIFIER;
  }
  return 0;
};

export const processDailyRecovery = (state: GameState): RecoveryResult => {
  const recoveredPlayers: string[] = [];
  const logs: string[] = [];

  for (const id in state.people.playerStates) {
    const pState = state.people.playerStates[id];

    if (pState.fitness >= RECOVERY_CONSTANTS.MAX_FITNESS) continue;

    const contract = Object.values(state.market.contracts).find(
      (c) => c.playerId === id && c.active
    );

    if (!contract) {
      pState.fitness = Math.min(
        RECOVERY_CONSTANTS.MAX_FITNESS,
        pState.fitness + RECOVERY_CONSTANTS.BASE_RATE
      );
      continue;
    }

    const player = state.people.players[id];
    const age = player
      ? Math.floor(
          (state.meta.currentDate - player.birthDate) /
            RECOVERY_CONSTANTS.MS_PER_YEAR
        )
      : RECOVERY_CONSTANTS.DEFAULT_AGE_IF_UNKNOWN;

    const staffBonus = getStaffBonus(state, contract.clubId);
    const infraBonus = getInfraBonus(state, contract.clubId);
    const ageMod = getAgeModifier(age);

    const totalRate =
      RECOVERY_CONSTANTS.BASE_RATE * (1 + staffBonus + infraBonus + ageMod);

    pState.fitness = Math.min(
      RECOVERY_CONSTANTS.MAX_FITNESS,
      pState.fitness + totalRate
    );
  }

  for (const injuryId in state.people.playerInjuries) {
    const injury = state.people.playerInjuries[injuryId];

    if (state.meta.currentDate >= injury.estimatedReturnDate) {
      recoveredPlayers.push(injury.playerId);

      const logMsg = `🏥 ${injury.name} recebeu alta do Departamento Médico.`;

      const contract = Object.values(state.market.contracts).find(
        (c) =>
          c.playerId === injury.playerId &&
          c.active &&
          c.clubId === state.meta.userClubId
      );

      if (contract) {
        logs.push(logMsg);

        eventBus.emit(state, "PLAYER_RECOVERED", {
          playerId: injury.playerId,
          injuryName: injury.name || "Lesão",
        });
      }

      delete state.people.playerInjuries[injuryId];

      if (state.people.playerStates[injury.playerId]) {
        state.people.playerStates[injury.playerId].fitness =
          RECOVERY_CONSTANTS.FITNESS_AFTER_INJURY;

        state.people.playerStates[injury.playerId].matchReadiness =
          RECOVERY_CONSTANTS.RELAPSE_RISK_READINESS;
      }
    }
  }

  return { recoveredPlayers, logs };
};
