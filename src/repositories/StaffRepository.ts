import { eq } from "drizzle-orm";
import { staff } from "../db/schema";
import { BaseRepository } from "./BaseRepository";

export type StaffSelect = typeof staff.$inferSelect;
export type StaffInsert = typeof staff.$inferInsert;

export class StaffRepository extends BaseRepository {
  async findById(id: number): Promise<StaffSelect | undefined> {
    const result = await this.db.select().from(staff).where(eq(staff.id, id));
    return result[0];
  }

  async findByTeamId(teamId: number): Promise<StaffSelect[]> {
    return await this.db.select().from(staff).where(eq(staff.teamId, teamId));
  }

  async findFreeAgents(): Promise<StaffSelect[]> {
    return await this.db
      .select()
      .from(staff)
      .where(eq(staff.teamId, null as any));
  }

  async create(data: StaffInsert): Promise<number> {
    const result = await this.db
      .insert(staff)
      .values(data)
      .returning({ id: staff.id });
    return result[0].id;
  }

  async update(id: number, data: Partial<StaffInsert>): Promise<void> {
    await this.db.update(staff).set(data).where(eq(staff.id, id));
  }

  async fire(id: number): Promise<void> {
    await this.db
      .update(staff)
      .set({ teamId: null, contractEnd: null, salary: 0 })
      .where(eq(staff.id, id));
  }
}

export const staffRepository = new StaffRepository();
