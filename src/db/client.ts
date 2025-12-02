import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dbPath =
  process.env.NODE_ENV === "development"
    ? "game.db"
    : path.join((process as any).resourcesPath, "game.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
