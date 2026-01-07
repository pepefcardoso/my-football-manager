import { GameState } from "../models/gameState";
import { eventBus } from "../events/EventBus";

const RECOVERY_CONFIG = {
  BASE_RATE: 10,
  AGE_PENALTY_THRESHOLD: 32,
  AGE_BONUS_THRESHOLD: 25,
  RELAPSE_RISK_READINESS: 70,
};

export interface RecoveryResult {
  recoveredPlayers: string[];
  logs: string[];
}

const getStaffBonus = (state: GameState, clubId: string): number => {
  const staffContracts = Object.values(state.staffContracts).filter(
    (c) => c.clubId === clubId && c.active
  );

  if (staffContracts.length === 0) return 0;

  let bestOverall = 0;
  staffContracts.forEach((c) => {
    const staff = state.staff[c.staffId];
    if (staff && staff.overall > bestOverall) bestOverall = staff.overall;
  });

  if (bestOverall >= 80) return 0.15;
  if (bestOverall >= 50) return 0.05;
  return 0;
};

const getInfraBonus = (state: GameState, clubId: string): number => {
  const infra = state.clubInfras[clubId];
  if (!infra) return 0;

  if (infra.medicalCenterLevel >= 80) return 0.2;

  if (infra.medicalCenterLevel >= 40) return 0.1;

  return 0;
};

const getAgeModifier = (age: number): number => {
  if (age < RECOVERY_CONFIG.AGE_BONUS_THRESHOLD) return 0.05;
  if (age > RECOVERY_CONFIG.AGE_PENALTY_THRESHOLD) return -0.1;
  return 0;
};

export const processDailyRecovery = (state: GameState): RecoveryResult => {
  const recoveredPlayers: string[] = [];
  const logs: string[] = [];

  for (const id in state.playerStates) {
    const pState = state.playerStates[id];

    if (pState.fitness >= 100) continue;

    const contract = Object.values(state.contracts).find(
      (c) => c.playerId === id && c.active
    );
    if (!contract) {
      pState.fitness = Math.min(
        100,
        pState.fitness + RECOVERY_CONFIG.BASE_RATE
      );
      continue;
    }

    const player = state.players[id];
    const age = player
      ? Math.floor((state.meta.currentDate - player.birthDate) / 31536000000)
      : 25;

    const staffBonus = getStaffBonus(state, contract.clubId);
    const infraBonus = getInfraBonus(state, contract.clubId);
    const ageMod = getAgeModifier(age);

    const totalRate =
      RECOVERY_CONFIG.BASE_RATE * (1 + staffBonus + infraBonus + ageMod);

    pState.fitness = Math.min(100, pState.fitness + totalRate);
  }

  for (const injuryId in state.playerInjuries) {
    const injury = state.playerInjuries[injuryId];

    if (state.meta.currentDate >= injury.estimatedReturnDate) {
      recoveredPlayers.push(injury.playerId);

      const logMsg = `🏥 ${injury.name} recebeu alta do Departamento Médico.`;

      const contract = Object.values(state.contracts).find(
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

      delete state.playerInjuries[injuryId];

      if (state.playerStates[injury.playerId]) {
        state.playerStates[injury.playerId].fitness = 90;

        state.playerStates[injury.playerId].matchReadiness =
          RECOVERY_CONFIG.RELAPSE_RISK_READINESS;
      }
    }
  }

  return { recoveredPlayers, logs };
};
