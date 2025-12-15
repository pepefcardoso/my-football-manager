import Database from "better-sqlite3";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema";
import path from "path";
import fs from "fs";
import { createRequire } from "module";
import { Logger } from "./Logger";

const require = createRequire(import.meta.url);

export type DbInstance = BetterSQLite3Database<typeof schema>;
export type DbTransaction = Parameters<
  Parameters<DbInstance["transaction"]>[0]
>[0];

const logger = new Logger("Database");

/**
 * Determines the database path based on the environment.
 */
const getDatabasePath = (): string => {
  if (process.env.NODE_ENV === "development") {
    return path.join(process.cwd(), "data", "database.sqlite");
  }

  if (process.versions.electron) {
    try {
      const { app } = require("electron");
      if (app) {
        return path.join(app.getPath("userData"), "database.sqlite");
      }
    } catch (error) {
      logger.warn("Could not load electron module:", error);
    }
  }

  return path.join(process.cwd(), "data", "database.sqlite");
};

/**
 * Ensures the directory for the database exists.
 */
const ensureDatabaseDirectory = (filePath: string) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    logger.info(`Creating database directory at: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
};

const dbPath = getDatabasePath();
ensureDatabaseDirectory(dbPath);

let sqlite: Database.Database;

try {
  logger.info("Initializing Database persistence layer...");
  logger.info(`Storage Path: ${dbPath}`);

  sqlite = new Database(dbPath);

  sqlite.pragma("journal_mode = WAL");

  sqlite.pragma("foreign_keys = ON");

  logger.info("Database connection established successfully.");
} catch (error) {
  logger.error("Critical Error: Failed to initialize database.", error);
  throw error;
}

export const db = drizzle(sqlite, { schema });
