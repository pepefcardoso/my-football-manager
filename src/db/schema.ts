import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import type { TeamAchievement } from "../domain/models";

export interface ActiveConstruction {
  facilityType: "stadium" | "training" | "medical" | "youth" | "admin";
  targetLevel?: number;
  targetCapacity?: number;
  cost: number;
  startDate: string;
  endDate: string;
}

export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  primaryColor: text("primary_color").default("#000000").notNull(),
  secondaryColor: text("secondary_color").default("#ffffff").notNull(),
  reputation: integer("reputation").default(0).notNull(),
  budget: real("budget").default(0).notNull(),
  isHuman: integer("is_human", { mode: "boolean" }).default(false).notNull(),
  stadiumCapacity: integer("stadium_capacity").default(10000).notNull(),
  stadiumQuality: integer("stadium_quality").default(20).notNull(),
  trainingCenterQuality: integer("training_center_quality")
    .default(20)
    .notNull(),
  youthAcademyQuality: integer("youth_academy_quality").default(20).notNull(),
  medicalCenterQuality: integer("medical_center_quality").default(20).notNull(),
  administrativeCenterQuality: integer("administrative_center_quality")
    .default(20)
    .notNull(),
  activeConstruction: text("active_construction", { mode: "json" })
    .$type<ActiveConstruction | null>()
    .default(null),
  fanSatisfaction: integer("fan_satisfaction").default(50).notNull(),
  fanBase: integer("fan_base").default(10000).notNull(),
  headCoachId: integer("head_coach_id"),
  footballDirectorId: integer("football_director_id"),
  executiveDirectorId: integer("executive_director_id"),
  transferBudget: real("transfer_budget").default(0).notNull(),
  transferStrategy: text("transfer_strategy").default("balanced").notNull(),
  history: text("history", { mode: "json" })
    .$type<TeamAchievement[]>()
    .default([])
    .notNull(),
  defaultFormation: text("default_formation").default("4-4-2").notNull(),
  defaultGameStyle: text("default_game_style").default("balanced").notNull(),
  defaultMarking: text("default_marking").default("man_to_man").notNull(),
  defaultMentality: text("default_mentality").default("normal").notNull(),
  defaultPassingDirectness: text("default_passing_directness")
    .default("mixed")
    .notNull(),
});

export const matchTactics = sqliteTable(
  "match_tactics",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    matchId: integer("match_id")
      .references(() => matches.id, { onDelete: "cascade" })
      .notNull(),
    teamId: integer("team_id")
      .references(() => teams.id)
      .notNull(),
    isHome: integer("is_home", { mode: "boolean" }).notNull(),
    formation: text("formation").notNull().default("4-4-2"),
    gameStyle: text("game_style").notNull().default("balanced"),
    marking: text("marking").notNull().default("man_to_man"),
    mentality: text("mentality").notNull().default("normal"),
    passingDirectness: text("passing_directness").notNull().default("mixed"),
    startingLineup: text("starting_lineup", { mode: "json" })
      .$type<number[]>()
      .notNull()
      .default([]),
    bench: text("bench", { mode: "json" })
      .$type<number[]>()
      .notNull()
      .default([]),
  },
  (table) => ({
    matchIdx: index("idx_match_tactics_match").on(table.matchId),
    teamIdx: index("idx_match_tactics_team").on(table.teamId),
  })
);

export const transferProposals = sqliteTable(
  "transfer_proposals",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    playerId: integer("player_id")
      .references(() => players.id)
      .notNull(),
    fromTeamId: integer("from_team_id")
      .references(() => teams.id)
      .notNull(),
    toTeamId: integer("to_team_id").references(() => teams.id),
    type: text("type").notNull(),
    status: text("status").default("pending").notNull(),
    fee: real("fee").default(0).notNull(),
    wageOffer: real("wage_offer").default(0).notNull(),
    contractLength: integer("contract_length").default(1),
    createdAt: text("created_at").notNull(),
    responseDeadline: text("response_deadline").notNull(),
    counterOfferFee: real("counter_offer_fee"),
    rejectionReason: text("rejection_reason"),
  },
  (table) => ({
    fromTeamIdx: index("idx_proposals_from_team").on(table.fromTeamId),
    toTeamIdx: index("idx_proposals_to_team").on(table.toTeamId),
    statusIdx: index("idx_proposals_status").on(table.status),
  })
);

export const clubInterests = sqliteTable(
  "club_interests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .references(() => teams.id)
      .notNull(),
    playerId: integer("player_id")
      .references(() => players.id)
      .notNull(),

    interestLevel: text("interest_level").default("observing").notNull(),
    priority: integer("priority").default(0).notNull(),

    maxFeeWillingToPay: real("max_fee_willing_to_pay"),
    dateAdded: text("date_added").notNull(),
  },
  (table) => ({
    teamInterestIdx: index("idx_interests_team").on(table.teamId),
    playerInterestIdx: index("idx_interests_player").on(table.playerId),
  })
);

export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").references(() => teams.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  age: integer("age").notNull(),
  birthDate: text("birth_date"),
  nationality: text("nationality").default("BRA").notNull(),
  position: text("position").notNull(),
  preferredFoot: text("preferred_foot").default("right").notNull(),
  overall: integer("overall").notNull(),
  potential: integer("potential").notNull(),
  finishing: integer("finishing").default(10).notNull(),
  passing: integer("passing").default(10).notNull(),
  dribbling: integer("dribbling").default(10).notNull(),
  defending: integer("defending").default(10).notNull(),
  shooting: integer("shooting").default(10).notNull(),
  physical: integer("physical").default(10).notNull(),
  pace: integer("pace").default(10).notNull(),
  moral: integer("moral").default(100).notNull(),
  energy: integer("energy").default(100).notNull(),
  fitness: integer("fitness").default(100).notNull(),
  form: integer("form").default(50).notNull(),
  isYouth: integer("is_youth", { mode: "boolean" }).default(false).notNull(),
  isInjured: integer("is_injured", { mode: "boolean" })
    .default(false)
    .notNull(),
  injuryType: text("injury_type"),
  injuryDaysRemaining: integer("injury_days_remaining").default(0).notNull(),
  isCaptain: integer("is_captain", { mode: "boolean" })
    .default(false)
    .notNull(),
  suspensionGamesRemaining: integer("suspension_games_remaining")
    .default(0)
    .notNull(),
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
  type: text("type").default("professional").notNull(),
  status: text("status").default("active").notNull(),
});

export const staff = sqliteTable("staff", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").references(() => teams.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  age: integer("age").notNull(),
  nationality: text("nationality").default("BRA").notNull(),
  role: text("role").notNull(),
  overall: integer("overall").notNull(),
  salary: real("salary").default(0).notNull(),
  contractEnd: text("contract_end"),
  specialization: text("specialization"),
});

export const competitions = sqliteTable("competitions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  country: text("country").notNull(),
  tier: integer("tier").default(1).notNull(),
  type: text("type").notNull().default("league"),
  priority: integer("priority").default(1).notNull(),
  config: text("config", { mode: "json" })
    .$type<Record<string, any>>()
    .notNull()
    .default({}),
  teams: integer("teams").default(20).notNull(),
  prize: real("prize").default(0).notNull(),
  reputation: integer("reputation").default(0).notNull(),
  window: text("window").default("national"),
  startMonth: integer("start_month").default(1),
  endMonth: integer("end_month").default(12),
});

export const competitionStandings = sqliteTable("competition_standings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  competitionId: integer("competition_id").references(() => competitions.id),
  seasonId: integer("season_id").references(() => seasons.id),
  teamId: integer("team_id").references(() => teams.id),
  groupName: text("group_name"),
  phase: text("phase").default("regular"),
  played: integer("played").default(0).notNull(),
  wins: integer("wins").default(0).notNull(),
  draws: integer("draws").default(0).notNull(),
  losses: integer("losses").default(0).notNull(),
  goalsFor: integer("goals_for").default(0).notNull(),
  goalsAgainst: integer("goals_against").default(0).notNull(),
  points: integer("points").default(0).notNull(),
});

export const playerCompetitionStats = sqliteTable("player_competition_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playerId: integer("player_id").references(() => players.id),
  teamId: integer("team_id").references(() => teams.id),
  competitionId: integer("competition_id").references(() => competitions.id),
  seasonId: integer("season_id").references(() => seasons.id),
  matches: integer("matches").default(0).notNull(),
  goals: integer("goals").default(0).notNull(),
  assists: integer("assists").default(0).notNull(),
  yellowCards: integer("yellow_cards").default(0).notNull(),
  redCards: integer("red_cards").default(0).notNull(),
  averageRating: real("average_rating").default(0).notNull(),
  saves: integer("saves").default(0).notNull(),
  cleanSheets: integer("clean_sheets").default(0).notNull(),
  goalsConceded: integer("goals_conceded").default(0).notNull(),
  minutesPlayed: integer("minutes_played").default(0).notNull(),
});

export const seasons = sqliteTable("seasons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  year: integer("year").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(false).notNull(),
});

export const matches = sqliteTable("matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  competitionId: integer("competition_id").references(() => competitions.id),
  seasonId: integer("season_id").references(() => seasons.id),
  homeTeamId: integer("home_team_id").references(() => teams.id),
  awayTeamId: integer("away_team_id").references(() => teams.id),
  date: text("date").notNull(),
  round: integer("round"),
  groupName: text("group_name"),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  isPlayed: integer("is_played", { mode: "boolean" }).default(false).notNull(),
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
  fee: real("fee").default(0).notNull(),
  date: text("date").notNull(),
  seasonId: integer("season_id").references(() => seasons.id),
  type: text("type").default("transfer").notNull(),
});

export const scoutingReports = sqliteTable("scouting_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playerId: integer("player_id").references(() => players.id),
  scoutId: integer("scout_id").references(() => staff.id),
  teamId: integer("team_id").references(() => teams.id),
  date: text("date").notNull(),
  progress: integer("progress").default(0).notNull(),
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

export const scheduledEvents = sqliteTable(
  "scheduled_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .references(() => teams.id)
      .notNull(),
    date: text("date").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    processed: integer("processed", { mode: "boolean" })
      .default(false)
      .notNull(),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, any>>(),
  },
  (table) => ({
    dateIdx: index("idx_scheduled_events_date").on(table.date),
    processedIdx: index("idx_scheduled_events_processed").on(table.processed),
  })
);

export const gameState = sqliteTable("game_state", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saveId: text("save_id").notNull(),
  currentDate: text("current_date").notNull(),
  currentSeasonId: integer("current_season_id").references(() => seasons.id),
  managerName: text("manager_name").default("Treinador").notNull(),
  playerTeamId: integer("player_team_id").references(() => teams.id),
  simulationSpeed: integer("simulation_speed").default(1).notNull(),
  trainingFocus: text("training_focus").default("technical"),
  totalPlayTime: integer("total_play_time").default(0),
  lastPlayedAt: text("last_played_at"),
  playerFormation: text("player_formation").default("4-4-2"),
  playerGameStyle: text("player_game_style").default("balanced"),
  playerMarking: text("player_marking").default("man_to_man"),
  playerMentality: text("player_mentality").default("normal"),
  playerPassingDirectness: text("player_passing_directness").default("mixed"),
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
  sentProposals: many(transferProposals, { relationName: "proposalsSent" }),
  receivedProposals: many(transferProposals, {
    relationName: "proposalsReceived",
  }),
  interests: many(clubInterests),
  matchTactics: many(matchTactics),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  team: one(teams, { fields: [players.teamId], references: [teams.id] }),
  contracts: many(playerContracts),
  currentContract: one(playerContracts, {
    fields: [players.id],
    references: [playerContracts.playerId],
  }),
  transferProposals: many(transferProposals),
  interestedClubs: many(clubInterests),
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
  team: one(teams, { fields: [staff.teamId], references: [teams.id] }),
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
  tactics: many(matchTactics),
}));

export const scoutingReportsRelations = relations(
  scoutingReports,
  ({ one }) => ({
    player: one(players, {
      fields: [scoutingReports.playerId],
      references: [players.id],
    }),
    scout: one(staff, {
      fields: [scoutingReports.scoutId],
      references: [staff.id],
    }),
    team: one(teams, {
      fields: [scoutingReports.teamId],
      references: [teams.id],
    }),
  })
);

export const transfersRelations = relations(transfers, ({ one }) => ({
  player: one(players, {
    fields: [transfers.playerId],
    references: [players.id],
  }),
  fromTeam: one(teams, {
    fields: [transfers.fromTeamId],
    references: [teams.id],
  }),
  toTeam: one(teams, { fields: [transfers.toTeamId], references: [teams.id] }),
  season: one(seasons, {
    fields: [transfers.seasonId],
    references: [seasons.id],
  }),
}));

export const competitionStandingsRelations = relations(
  competitionStandings,
  ({ one }) => ({
    competition: one(competitions, {
      fields: [competitionStandings.competitionId],
      references: [competitions.id],
    }),
    team: one(teams, {
      fields: [competitionStandings.teamId],
      references: [teams.id],
    }),
    season: one(seasons, {
      fields: [competitionStandings.seasonId],
      references: [seasons.id],
    }),
  })
);

export const transferProposalsRelations = relations(
  transferProposals,
  ({ one }) => ({
    player: one(players, {
      fields: [transferProposals.playerId],
      references: [players.id],
    }),
    fromTeam: one(teams, {
      fields: [transferProposals.fromTeamId],
      references: [teams.id],
      relationName: "proposalsSent",
    }),
    toTeam: one(teams, {
      fields: [transferProposals.toTeamId],
      references: [teams.id],
      relationName: "proposalsReceived",
    }),
  })
);

export const clubInterestsRelations = relations(clubInterests, ({ one }) => ({
  team: one(teams, {
    fields: [clubInterests.teamId],
    references: [teams.id],
  }),
  player: one(players, {
    fields: [clubInterests.playerId],
    references: [players.id],
  }),
}));

export const playerCompetitionStatsRelations = relations(
  playerCompetitionStats,
  ({ one }) => ({
    player: one(players, {
      fields: [playerCompetitionStats.playerId],
      references: [players.id],
    }),
    team: one(teams, {
      fields: [playerCompetitionStats.teamId],
      references: [teams.id],
    }),
    competition: one(competitions, {
      fields: [playerCompetitionStats.competitionId],
      references: [competitions.id],
    }),
    season: one(seasons, {
      fields: [playerCompetitionStats.seasonId],
      references: [seasons.id],
    }),
  })
);

export const matchTacticsRelations = relations(matchTactics, ({ one }) => ({
  match: one(matches, {
    fields: [matchTactics.matchId],
    references: [matches.id],
  }),
  team: one(teams, {
    fields: [matchTactics.teamId],
    references: [teams.id],
  }),
}));
