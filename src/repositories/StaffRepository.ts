import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { staff } from "../db/schema";

export type StaffSelect = typeof staff.$inferSelect;
export type StaffInsert = typeof staff.$inferInsert;

export class StaffRepository {
  async findById(id: number): Promise<StaffSelect | undefined> {
    const result = await db.select().from(staff).where(eq(staff.id, id));
    return result[0];
  }

  async findByTeamId(teamId: number): Promise<StaffSelect[]> {
    return await db.select().from(staff).where(eq(staff.teamId, teamId));
  }

  async findFreeAgents(): Promise<StaffSelect[]> {
    return await db
      .select()
      .from(staff)
      .where(eq(staff.teamId, null as any));
  }

  async create(data: StaffInsert): Promise<number> {
    const result = await db
      .insert(staff)
      .values(data)
      .returning({ id: staff.id });
    return result[0].id;
  }

  async update(id: number, data: Partial<StaffInsert>): Promise<void> {
    await db.update(staff).set(data).where(eq(staff.id, id));
  }

  async fire(id: number): Promise<void> {
    await db
      .update(staff)
      .set({ teamId: null, contractEnd: null, salary: 0 })
      .where(eq(staff.id, id));
  }
}

export const staffRepository = new StaffRepository();
