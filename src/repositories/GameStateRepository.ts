import { eq } from "drizzle-orm";
import { gameState } from "../db/schema";
import { BaseRepository } from "./BaseRepository";
import type { GameState } from "../domain/models";

export class GameStateRepository extends BaseRepository {
  async findCurrent(): Promise<GameState | undefined> {
    const result = await this.db.select().from(gameState).limit(1);
    return result[0] as GameState | undefined;
  }

  async save(state: Partial<GameState>): Promise<void> {
    const current = await this.findCurrent();
    if (current) {
      await this.db
        .update(gameState)
        .set(state)
        .where(eq(gameState.id, current.id));
    } else {
      await this.db.insert(gameState).values(state as any);
    }
  }
}

export const gameStateRepository = new GameStateRepository();
