import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { seasons } from "../../db/schema";

export type SeasonSelect = typeof seasons.$inferSelect;

export class SeasonRepository {
  async findActiveSeason(): Promise<SeasonSelect | undefined> {
    const result = await db
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
    await db
      .update(seasons)
      .set({ isActive: false })
      .where(eq(seasons.isActive, true));

    const result = await db
      .insert(seasons)
      .values({ year, startDate, endDate, isActive: true })
      .returning();

    return result[0];
  }
}

export const seasonRepository = new SeasonRepository();
