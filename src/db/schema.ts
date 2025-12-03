import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  primaryColor: text("primary_color").default("#000000"),
  secondaryColor: text("secondary_color").default("#ffffff"),
  reputation: integer("reputation").default(0),
  budget: real("budget").default(0),
  isHuman: integer("is_human", { mode: "boolean" }).default(false),
  stadiumCapacity: integer("stadium_capacity").default(10000),
  stadiumQuality: integer("stadium_quality").default(50),
  trainingCenterQuality: integer("training_center_quality").default(50),
  youthAcademyQuality: integer("youth_academy_quality").default(50),
  fanSatisfaction: integer("fan_satisfaction").default(50),
  fanBase: integer("fan_base").default(10000),
  headCoachId: integer("head_coach_id"),
  footballDirectorId: integer("football_director_id"),
  executiveDirectorId: integer("executive_director_id"),
});

export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").references(() => teams.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  age: integer("age").notNull(),
  nationality: text("nationality").default("BRA"),
  position: text("position").notNull(),
  preferredFoot: text("preferred_foot").default("right"),
  overall: integer("overall").notNull(),
  potential: integer("potential").notNull(),
  finishing: integer("finishing").default(10),
  passing: integer("passing").default(10),
  dribbling: integer("dribbling").default(10),
  defending: integer("defending").default(10),
  shooting: integer("shooting").default(10),
  physical: integer("physical").default(10),
  pace: integer("pace").default(10),
  moral: integer("moral").default(100),
  energy: integer("energy").default(100),
  fitness: integer("fitness").default(100),
  form: integer("form").default(50),
  isYouth: integer("is_youth", { mode: "boolean" }).default(false),
  isInjured: integer("is_injured", { mode: "boolean" }).default(false),
  injuryType: text("injury_type"),
  injuryDaysRemaining: integer("injury_days_remaining").default(0),
  isCaptain: integer("is_captain", { mode: "boolean" }).default(false),
});

export const playerContracts = sqliteTable("player_contracts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playerId: integer("player_id")
    .references(() => players.id)
    .notNull(),
  teamId: integer("team_id")
    .references(() => teams.id)
    .notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  wage: real("wage").notNull(),
  releaseClause: real("release_clause"),
  type: text("type").default("professional"),
  status: text("status").default("active"),
});

export const staff = sqliteTable("staff", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").references(() => teams.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  age: integer("age").notNull(),
  nationality: text("nationality").default("BRA"),
  role: text("role").notNull(),
  overall: integer("overall").notNull(),
  salary: real("salary").default(0),
  contractEnd: text("contract_end"),
  specialization: text("specialization"),
});

export const competitions = sqliteTable("competitions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  country: text("country").notNull(),
  tier: integer("tier").default(1),
  format: text("format").notNull(),
  teams: integer("teams").default(20),
  prize: real("prize").default(0),
  reputation: integer("reputation").default(0),
});

export const competitionStandings = sqliteTable("competition_standings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  competitionId: integer("competition_id").references(() => competitions.id),
  seasonId: integer("season_id").references(() => seasons.id),
  teamId: integer("team_id").references(() => teams.id),
  played: integer("played").default(0),
  wins: integer("wins").default(0),
  draws: integer("draws").default(0),
  losses: integer("losses").default(0),
  goalsFor: integer("goals_for").default(0),
  goalsAgainst: integer("goals_against").default(0),
  points: integer("points").default(0),
});

export const seasons = sqliteTable("seasons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  year: integer("year").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(false),
});

export const matches = sqliteTable("matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  competitionId: integer("competition_id").references(() => competitions.id),
  seasonId: integer("season_id").references(() => seasons.id),
  homeTeamId: integer("home_team_id").references(() => teams.id),
  awayTeamId: integer("away_team_id").references(() => teams.id),
  date: text("date").notNull(),
  round: integer("round"),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  isPlayed: integer("is_played", { mode: "boolean" }).default(false),
  attendance: integer("attendance"),
  ticketRevenue: real("ticket_revenue"),
  weather: text("weather"),
});

export const matchEvents = sqliteTable("match_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  matchId: integer("match_id").references(() => matches.id),
  minute: integer("minute").notNull(),
  type: text("type").notNull(),
  teamId: integer("team_id").references(() => teams.id),
  playerId: integer("player_id").references(() => players.id),
  description: text("description"),
});

export const transfers = sqliteTable("transfers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playerId: integer("player_id").references(() => players.id),
  fromTeamId: integer("from_team_id").references(() => teams.id),
  toTeamId: integer("to_team_id").references(() => teams.id),
  fee: real("fee").default(0),
  date: text("date").notNull(),
  seasonId: integer("season_id").references(() => seasons.id),
  type: text("type").default("transfer"),
});

export const scoutingReports = sqliteTable("scouting_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playerId: integer("player_id").references(() => players.id),
  scoutId: integer("scout_id").references(() => staff.id),
  teamId: integer("team_id").references(() => teams.id),
  date: text("date").notNull(),
  progress: integer("progress").default(0),
  overallEstimate: integer("overall_estimate"),
  potentialEstimate: integer("potential_estimate"),
  notes: text("notes"),
  recommendation: text("recommendation"),
});

export const financialRecords = sqliteTable("financial_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").references(() => teams.id),
  seasonId: integer("season_id").references(() => seasons.id),

  date: text("date").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
});

export const gameState = sqliteTable("game_state", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  currentDate: text("current_date").notNull(),
  currentSeasonId: integer("current_season_id").references(() => seasons.id),
  managerName: text("manager_name").default("Treinador"),
  playerTeamId: integer("player_team_id").references(() => teams.id),
  simulationSpeed: integer("simulation_speed").default(1),
});

export const teamsRelations = relations(teams, ({ many, one }) => ({
  players: many(players),
  staff: many(staff),
  homeMatches: many(matches, { relationName: "homeTeam" }),
  awayMatches: many(matches, { relationName: "awayTeam" }),
  financialRecords: many(financialRecords),
  headCoach: one(staff, {
    fields: [teams.headCoachId],
    references: [staff.id],
  }),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  team: one(teams, {
    fields: [players.teamId],
    references: [teams.id],
  }),
  contracts: many(playerContracts),
  currentContract: one(playerContracts, {
    fields: [players.id],
    references: [playerContracts.playerId],
  }),
}));

export const playerContractsRelations = relations(
  playerContracts,
  ({ one }) => ({
    player: one(players, {
      fields: [playerContracts.playerId],
      references: [players.id],
    }),
    team: one(teams, {
      fields: [playerContracts.teamId],
      references: [teams.id],
    }),
  })
);

export const staffRelations = relations(staff, ({ one }) => ({
  team: one(teams, {
    fields: [staff.teamId],
    references: [teams.id],
  }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  competition: one(competitions, {
    fields: [matches.competitionId],
    references: [competitions.id],
  }),
  homeTeam: one(teams, {
    fields: [matches.homeTeamId],
    references: [teams.id],
    relationName: "homeTeam",
  }),
  awayTeam: one(teams, {
    fields: [matches.awayTeamId],
    references: [teams.id],
    relationName: "awayTeam",
  }),
  events: many(matchEvents),
}));
