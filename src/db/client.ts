import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import { fileURLToPath } from "url";

let dbPath: string;

if (process.env.NODE_ENV === "development") {
  dbPath = path.join(process.cwd(), "data", "database.sqlite");
}
else if ((process as any).resourcesPath) {
  dbPath = path.join((process as any).resourcesPath, "database.sqlite");
}
else {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  dbPath = path.join(__dirname, "../../data/database.sqlite");
}

console.log("📁 Database path:", dbPath);

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
