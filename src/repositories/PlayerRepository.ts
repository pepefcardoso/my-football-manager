import { eq, and, SQL, lte, gte, isNull, sql } from "drizzle-orm";
import { players } from "../db/schema";
import { BaseRepository } from "./BaseRepository";
import type { Player } from "../domain/models";

export interface PlayerSearchFilters {
  country?: string;
  position?: string;
  ageGroup?: "young" | "prime" | "veteran";
  minOverall?: number;
  contractStatus?: "any" | "free_agent";
}

export class PlayerRepository extends BaseRepository {
  async findById(id: number): Promise<Player | undefined> {
    const result = await this.db.query.players.findFirst({
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
    const result = await this.db.query.players.findMany({
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
    const result = await this.db.query.players.findMany({
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
    const result = await this.db.query.players.findMany({
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
    const result = await this.db
      .insert(players)
      .values(player)
      .returning({ id: players.id });
    return result[0].id;
  }

  async update(id: number, data: any): Promise<void> {
    await this.db.update(players).set(data).where(eq(players.id, id));
  }

  async updateConditionBatch(
    updates: { id: number; energy: number; fitness: number }[]
  ): Promise<void> {
    for (const update of updates) {
      await this.db
        .update(players)
        .set({ energy: update.energy, fitness: update.fitness })
        .where(eq(players.id, update.id));
    }
  }

  async updateDailyStatsBatch(
    updates: {
      id: number;
      energy: number;
      fitness: number;
      moral: number;
      overall?: number;
      injuryDays?: number;
      isInjured?: boolean;
    }[]
  ): Promise<void> {
    for (const u of updates) {
      const updateData: any = {
        energy: u.energy,
        fitness: u.fitness,
        moral: u.moral,
      };

      if (u.overall !== undefined) updateData.overall = u.overall;
      if (u.injuryDays !== undefined)
        updateData.injuryDaysRemaining = u.injuryDays;
      if (u.isInjured !== undefined) updateData.isInjured = u.isInjured;

      await this.db.update(players).set(updateData).where(eq(players.id, u.id));
    }
  }

  async findByCriteria(
    filters: PlayerSearchFilters,
    limit: number = 20
  ): Promise<Player[]> {
    const conditions: SQL[] = [];

    if (filters.country && filters.country !== "Global") {
      conditions.push(eq(players.nationality, filters.country));
    }

    if (filters.position) {
      conditions.push(eq(players.position, filters.position));
    }

    if (filters.minOverall) {
      conditions.push(gte(players.overall, filters.minOverall));
    }

    if (filters.ageGroup) {
      if (filters.ageGroup === "young") {
        conditions.push(lte(players.age, 23));
      } else if (filters.ageGroup === "prime") {
        conditions.push(and(gte(players.age, 24), lte(players.age, 29))!);
      } else if (filters.ageGroup === "veteran") {
        conditions.push(gte(players.age, 30));
      }
    }

    if (filters.contractStatus === "free_agent") {
      conditions.push(isNull(players.teamId));
    }

    const result = await this.db
      .select()
      .from(players)
      .where(and(...conditions))
      .orderBy(sql`RANDOM()`)
      .limit(limit);

    return result as unknown as Player[];
  }
}

export const playerRepository = new PlayerRepository();
