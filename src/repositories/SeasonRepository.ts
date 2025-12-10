import { eq } from "drizzle-orm";
import { seasons } from "../db/schema";
import { BaseRepository } from "./BaseRepository";

export type SeasonSelect = typeof seasons.$inferSelect;

export class SeasonRepository extends BaseRepository {
  async findActiveSeason(): Promise<SeasonSelect | undefined> {
    const result = await this.db
      .select()
      .from(seasons)
      .where(eq(seasons.isActive, true));
    return result[0];
  }

  async create(
    year: number,
    startDate: string,
    endDate: string
  ): Promise<SeasonSelect> {
    await this.db
      .update(seasons)
      .set({ isActive: false })
      .where(eq(seasons.isActive, true));

    const result = await this.db
      .insert(seasons)
      .values({ year, startDate, endDate, isActive: true })
      .returning();

    return result[0];
  }
}

export const seasonRepository = new SeasonRepository();
