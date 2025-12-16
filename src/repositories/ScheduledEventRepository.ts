import { and, eq } from "drizzle-orm";
import { scheduledEvents } from "../db/schema";
import { BaseRepository } from "./BaseRepository";

export type ScheduledEventInsert = typeof scheduledEvents.$inferInsert;
export type ScheduledEventSelect = typeof scheduledEvents.$inferSelect;

export class ScheduledEventRepository extends BaseRepository {
  async create(data: ScheduledEventInsert): Promise<void> {
    await this.db.insert(scheduledEvents).values(data);
  }

  async findPendingByDate(
    date: string,
    teamId: number
  ): Promise<ScheduledEventSelect[]> {
    return await this.db
      .select()
      .from(scheduledEvents)
      .where(
        and(
          eq(scheduledEvents.date, date),
          eq(scheduledEvents.teamId, teamId),
          eq(scheduledEvents.processed, false)
        )
      );
  }

  async markAsProcessed(id: number): Promise<void> {
    await this.db
      .update(scheduledEvents)
      .set({ processed: true })
      .where(eq(scheduledEvents.id, id));
  }
}

export const scheduledEventRepository = new ScheduledEventRepository();
