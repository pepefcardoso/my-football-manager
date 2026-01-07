import { GameState } from "../models/gameState";
import { Player } from "../models/people";
import { rng } from "../utils/generators";

const TRAINING_CONFIG = {
  AGE_YOUNG_CAP: 21,
  AGE_OLD_CAP: 30,
  GROWTH_BASE_RATE: 0.05,
  REGRESSION_RATE: 0.03,
  MAX_DAILY_GROWTH: 1.0,
  RNG_VARIANCE: 0.1,
  PLAYTIME_BONUS: 0.2,
  INFRA_LEVEL_5_THRESHOLD: 80,
  INFRA_LEVEL_1_THRESHOLD: 20,
};

export interface TrainingResult {
  improvedAttributes: number;
  logs: string[];
}

const getAge = (birthDate: number, currentDate: number): number => {
  return Math.floor((currentDate - birthDate) / (365 * 24 * 60 * 60 * 1000));
};

const calculateInfrastructureBonus = (trainingLevel: number): number => {
  if (trainingLevel >= TRAINING_CONFIG.INFRA_LEVEL_5_THRESHOLD) return 0.25;
  if (trainingLevel >= 60) return 0.15;
  if (trainingLevel >= 40) return 0.1;
  if (trainingLevel >= TRAINING_CONFIG.INFRA_LEVEL_1_THRESHOLD) return 0.05;
  return 0;
};

const getRecentPlaytimeMultiplier = (playerSeasonStats: any): number => {
  return playerSeasonStats && playerSeasonStats.gamesPlayed > 0
    ? 1 + TRAINING_CONFIG.PLAYTIME_BONUS
    : 1.0;
};

export const processDailyTraining = (state: GameState): TrainingResult => {
  let totalImprovements = 0;
  const logs: string[] = [];

  for (const contractId in state.contracts) {
    const contract = state.contracts[contractId];
    if (!contract.active) continue;

    const player = state.players[contract.playerId];
    if (!player) continue;

    const clubInfra = state.clubInfras[contract.clubId];
    const age = getAge(player.birthDate, state.meta.currentDate);
    const seasonStats = Object.values(state.playerSeasonStats).find(
      (s) =>
        s.playerId === player.id && s.seasonId === state.meta.activeSeasonId
    );

    if (age > TRAINING_CONFIG.AGE_OLD_CAP) {
      processRegression(
        player,
        age,
        logs,
        contract.clubId === state.meta.userClubId
      );
      continue;
    }

    const currentOverall = calculateSimpleOverall(player);
    const growthMargin = Math.max(0, player.potential - currentOverall);

    if (growthMargin <= 0) continue;
    
    let growthFactor = TRAINING_CONFIG.GROWTH_BASE_RATE;

    if (age < TRAINING_CONFIG.AGE_YOUNG_CAP) {
      growthFactor *= 2.0;
    }

    const infraBonus = clubInfra
      ? calculateInfrastructureBonus(clubInfra.trainingCenterLevel)
      : 0;
    growthFactor *= 1 + infraBonus;

    growthFactor *= getRecentPlaytimeMultiplier(seasonStats);

    const rngMod = 1 + rng.range(-10, 10) / 100;
    growthFactor *= rngMod;

    const pointsToDistribute = Math.min(
      growthFactor,
      TRAINING_CONFIG.MAX_DAILY_GROWTH
    );

    if (pointsToDistribute > 0.01) {
      const improved = applyGrowthToAttributes(player, pointsToDistribute);
      if (improved) {
        totalImprovements++;
        if (
          contract.clubId === state.meta.userClubId &&
          pointsToDistribute > 0.5
        ) {
          logs.push(
            `📈 ${
              player.name
            } evoluiu bem nos treinos (+${pointsToDistribute.toFixed(2)})`
          );
        }
      }
    }
  }

  return { improvedAttributes: totalImprovements, logs };
};

const applyGrowthToAttributes = (player: Player, amount: number): boolean => {
  const attributes: (keyof Player)[] = [
    "finishing",
    "passing",
    "crossing",
    "technique",
    "defending",
    "speed",
    "stamina",
    "intelligence",
  ];

  const targetAttr = rng.pick(attributes);
  const currentValue = player[targetAttr] as number;

  if (currentValue < 99) {
    (player[targetAttr] as number) += amount;
    player.overall = calculateSimpleOverall(player);
    return true;
  }
  return false;
};

const processRegression = (
  player: Player,
  age: number,
  logs: string[],
  isUserPlayer: boolean
) => {
  const decayChance = (age - 30) * 5;

  if (rng.range(0, 100) < decayChance) {
    const physicals: (keyof Player)[] = ["speed", "stamina", "force"];
    const target = rng.pick(physicals);
    const val = player[target] as number;

    if (val > 10) {
      const loss = TRAINING_CONFIG.REGRESSION_RATE;
      (player[target] as number) -= loss;

      if (isUserPlayer && rng.range(0, 100) < 10) {
        logs.push(`📉 ${player.name} perdeu rendimento físico devido à idade.`);
      }
    }
  }
};

const calculateSimpleOverall = (p: Player): number => {
  return (p.finishing + p.passing + p.speed + p.defending + p.technique) / 5;
};
