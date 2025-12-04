import { AttributeCalculator } from "../engine/AttributeCalculator";
import { playerRepository } from "../repositories/PlayerRepository";
import { players } from "../db/schema";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import type { Position } from "../domain/enums";

export class PlayerService {
  async updatePlayerOverall(playerId: number): Promise<void> {
    const player = await playerRepository.findById(playerId);
    if (!player) return;

    const newOverall = AttributeCalculator.calculateOverall(
      player.position as Position,
      {
        finishing: player.finishing || 0,
        passing: player.passing || 0,
        dribbling: player.dribbling || 0,
        defending: player.defending || 0,
        physical: player.physical || 0,
        pace: player.pace || 0,
        shooting: player.shooting || 0,
      }
    );

    if (newOverall !== player.overall) {
      await playerRepository.update(playerId, { overall: newOverall });
    }
  }

  async getPlayerWithContract(playerId: number) {
    return await db.query.players.findFirst({
      where: eq(players.id, playerId),
      with: {
        contracts: {
          where: (contracts, { eq }) => eq(contracts.status, "active"),
          limit: 1,
        },
      },
    });
  }
}

export const playerService = new PlayerService();
