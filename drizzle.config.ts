import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./data/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/database.sqlite",
  },
} as const);
