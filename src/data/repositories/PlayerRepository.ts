import { eq, and } from "drizzle-orm";
import { db } from "../../db/client";
import { players } from "../../db/schema";

import type { Player } from "../../domain/types";

export class PlayerRepository {
  async findById(id: number): Promise<Player | undefined> {
    const result = await db.query.players.findFirst({
      where: eq(players.id, id),
      with: {
        contracts: {
          where: (contracts, { eq }) => eq(contracts.status, "active"),
          limit: 1,
        },
      },
    });

    if (!result) return undefined;

    const activeContract = result.contracts[0];

    return {
      ...result,
      salary: activeContract ? activeContract.wage : 0,
      contractEnd: activeContract ? activeContract.endDate : null,
      releaseClause: activeContract ? activeContract.releaseClause : null,
    } as unknown as Player;
  }

  async findByTeamId(teamId: number): Promise<Player[]> {
    const result = await db.query.players.findMany({
      where: eq(players.teamId, teamId),
      with: {
        contracts: {
          where: (contracts, { eq }) => eq(contracts.status, "active"),
          limit: 1,
        },
      },
    });

    return result.map((p) => {
      const activeContract = p.contracts[0];
      return {
        ...p,
        salary: activeContract ? activeContract.wage : 0,
        contractEnd: activeContract ? activeContract.endDate : null,
        releaseClause: activeContract ? activeContract.releaseClause : null,
      };
    }) as unknown as Player[];
  }

  async findFreeAgents(): Promise<Player[]> {
    const result = await db.query.players.findMany({
      where: eq(players.teamId, null as any),
      with: {
        contracts: {
          where: (contracts, { eq }) => eq(contracts.status, "active"),
          limit: 1,
        },
      },
    });

    return result.map((p) => {
      const activeContract = p.contracts[0];
      return {
        ...p,
        salary: activeContract ? activeContract.wage : 0,
        contractEnd: activeContract ? activeContract.endDate : null,
        releaseClause: activeContract ? activeContract.releaseClause : null,
      };
    }) as unknown as Player[];
  }

  async findYouthAcademy(teamId: number): Promise<Player[]> {
    const result = await db.query.players.findMany({
      where: and(eq(players.teamId, teamId), eq(players.isYouth, true)),
      with: {
        contracts: {
          where: (contracts, { eq }) => eq(contracts.status, "active"),
          limit: 1,
        },
      },
    });

    return result.map((p) => {
      const activeContract = p.contracts[0];
      return {
        ...p,
        salary: activeContract ? activeContract.wage : 0,
        contractEnd: activeContract ? activeContract.endDate : null,
        releaseClause: activeContract ? activeContract.releaseClause : null,
      };
    }) as unknown as Player[];
  }

  async create(player: any): Promise<number> {
    const result = await db
      .insert(players)
      .values(player)
      .returning({ id: players.id });
    return result[0].id;
  }

  async update(id: number, data: any): Promise<void> {
    await db.update(players).set(data).where(eq(players.id, id));
  }

  async updateConditionBatch(
    updates: { id: number; energy: number; fitness: number }[]
  ): Promise<void> {
    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .update(players)
          .set({ energy: update.energy, fitness: update.fitness })
          .where(eq(players.id, update.id));
      }
    });
  }
}

export const playerRepository = new PlayerRepository();
