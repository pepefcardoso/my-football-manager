// src/db/schema.ts
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  primaryColor: text("primary_color").default("#000000"),
  secondaryColor: text("secondary_color").default("#ffffff"),
  reputation: integer("reputation").default(0),
  budget: real("budget").default(0),
  isHuman: integer("is_human", { mode: "boolean" }).default(false),
});

export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").references(() => teams.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  position: text("position").notNull(),
  age: integer("age").notNull(),
  overall: integer("overall").notNull(),
  attack: integer("attack").default(50),
  defense: integer("defense").default(50),
  physical: integer("physical").default(50),
  moral: integer("moral").default(100),
  energy: integer("energy").default(100),
});

export const gameState = sqliteTable("game_state", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  currentDate: text("current_date").notNull(),
  managerName: text("manager_name").default("Treinador"),
  playerTeamId: integer("player_team_id").references(() => teams.id),
});
