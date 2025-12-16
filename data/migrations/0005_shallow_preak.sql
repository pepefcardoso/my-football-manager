CREATE TABLE `club_interests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`interest_level` text DEFAULT 'observing' NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`max_fee_willing_to_pay` real,
	`date_added` text NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_interests_team` ON `club_interests` (`team_id`);--> statement-breakpoint
CREATE INDEX `idx_interests_player` ON `club_interests` (`player_id`);--> statement-breakpoint
CREATE TABLE `player_competition_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer,
	`team_id` integer,
	`competition_id` integer,
	`season_id` integer,
	`matches` integer DEFAULT 0 NOT NULL,
	`goals` integer DEFAULT 0 NOT NULL,
	`assists` integer DEFAULT 0 NOT NULL,
	`yellow_cards` integer DEFAULT 0 NOT NULL,
	`red_cards` integer DEFAULT 0 NOT NULL,
	`average_rating` real DEFAULT 0 NOT NULL,
	`saves` integer DEFAULT 0 NOT NULL,
	`clean_sheets` integer DEFAULT 0 NOT NULL,
	`goals_conceded` integer DEFAULT 0 NOT NULL,
	`minutes_played` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transfer_proposals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`from_team_id` integer NOT NULL,
	`to_team_id` integer,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`fee` real DEFAULT 0 NOT NULL,
	`wage_offer` real DEFAULT 0 NOT NULL,
	`contract_length` integer DEFAULT 1,
	`created_at` text NOT NULL,
	`response_deadline` text NOT NULL,
	`counter_offer_fee` real,
	`rejection_reason` text,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_proposals_from_team` ON `transfer_proposals` (`from_team_id`);--> statement-breakpoint
CREATE INDEX `idx_proposals_to_team` ON `transfer_proposals` (`to_team_id`);--> statement-breakpoint
CREATE INDEX `idx_proposals_status` ON `transfer_proposals` (`status`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_competition_standings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`competition_id` integer,
	`season_id` integer,
	`team_id` integer,
	`group_name` text,
	`phase` text DEFAULT 'regular',
	`played` integer DEFAULT 0 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`draws` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`goals_for` integer DEFAULT 0 NOT NULL,
	`goals_against` integer DEFAULT 0 NOT NULL,
	`points` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_competition_standings`("id", "competition_id", "season_id", "team_id", "group_name", "phase", "played", "wins", "draws", "losses", "goals_for", "goals_against", "points") SELECT "id", "competition_id", "season_id", "team_id", "group_name", "phase", "played", "wins", "draws", "losses", "goals_for", "goals_against", "points" FROM `competition_standings`;--> statement-breakpoint
DROP TABLE `competition_standings`;--> statement-breakpoint
ALTER TABLE `__new_competition_standings` RENAME TO `competition_standings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_competitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`country` text NOT NULL,
	`tier` integer DEFAULT 1 NOT NULL,
	`type` text DEFAULT 'league' NOT NULL,
	`priority` integer DEFAULT 1 NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`teams` integer DEFAULT 20 NOT NULL,
	`prize` real DEFAULT 0 NOT NULL,
	`reputation` integer DEFAULT 0 NOT NULL,
	`window` text DEFAULT 'national',
	`start_month` integer DEFAULT 1,
	`end_month` integer DEFAULT 12
);
--> statement-breakpoint
INSERT INTO `__new_competitions`("id", "name", "short_name", "country", "tier", "type", "priority", "config", "teams", "prize", "reputation", "window", "start_month", "end_month") SELECT "id", "name", "short_name", "country", "tier", "type", "priority", "config", "teams", "prize", "reputation", "window", "start_month", "end_month" FROM `competitions`;--> statement-breakpoint
DROP TABLE `competitions`;--> statement-breakpoint
ALTER TABLE `__new_competitions` RENAME TO `competitions`;--> statement-breakpoint
CREATE TABLE `__new_game_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`save_id` text NOT NULL,
	`current_date` text NOT NULL,
	`current_season_id` integer,
	`manager_name` text DEFAULT 'Treinador' NOT NULL,
	`player_team_id` integer,
	`simulation_speed` integer DEFAULT 1 NOT NULL,
	`training_focus` text DEFAULT 'technical',
	`total_play_time` integer DEFAULT 0,
	`last_played_at` text,
	FOREIGN KEY (`current_season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_game_state`("id", "save_id", "current_date", "current_season_id", "manager_name", "player_team_id", "simulation_speed", "training_focus", "total_play_time", "last_played_at") SELECT "id", "save_id", "current_date", "current_season_id", "manager_name", "player_team_id", "simulation_speed", "training_focus", "total_play_time", "last_played_at" FROM `game_state`;--> statement-breakpoint
DROP TABLE `game_state`;--> statement-breakpoint
ALTER TABLE `__new_game_state` RENAME TO `game_state`;--> statement-breakpoint
CREATE TABLE `__new_matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`competition_id` integer,
	`season_id` integer,
	`home_team_id` integer,
	`away_team_id` integer,
	`date` text NOT NULL,
	`round` integer,
	`group_name` text,
	`home_score` integer,
	`away_score` integer,
	`is_played` integer DEFAULT false NOT NULL,
	`attendance` integer,
	`ticket_revenue` real,
	`weather` text,
	FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`home_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`away_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_matches`("id", "competition_id", "season_id", "home_team_id", "away_team_id", "date", "round", "group_name", "home_score", "away_score", "is_played", "attendance", "ticket_revenue", "weather") SELECT "id", "competition_id", "season_id", "home_team_id", "away_team_id", "date", "round", "group_name", "home_score", "away_score", "is_played", "attendance", "ticket_revenue", "weather" FROM `matches`;--> statement-breakpoint
DROP TABLE `matches`;--> statement-breakpoint
ALTER TABLE `__new_matches` RENAME TO `matches`;--> statement-breakpoint
CREATE TABLE `__new_player_contracts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`wage` real NOT NULL,
	`release_clause` real,
	`type` text DEFAULT 'professional' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_player_contracts`("id", "player_id", "team_id", "start_date", "end_date", "wage", "release_clause", "type", "status") SELECT "id", "player_id", "team_id", "start_date", "end_date", "wage", "release_clause", "type", "status" FROM `player_contracts`;--> statement-breakpoint
DROP TABLE `player_contracts`;--> statement-breakpoint
ALTER TABLE `__new_player_contracts` RENAME TO `player_contracts`;--> statement-breakpoint
CREATE TABLE `__new_players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`age` integer NOT NULL,
	`nationality` text DEFAULT 'BRA' NOT NULL,
	`position` text NOT NULL,
	`preferred_foot` text DEFAULT 'right' NOT NULL,
	`overall` integer NOT NULL,
	`potential` integer NOT NULL,
	`finishing` integer DEFAULT 10 NOT NULL,
	`passing` integer DEFAULT 10 NOT NULL,
	`dribbling` integer DEFAULT 10 NOT NULL,
	`defending` integer DEFAULT 10 NOT NULL,
	`shooting` integer DEFAULT 10 NOT NULL,
	`physical` integer DEFAULT 10 NOT NULL,
	`pace` integer DEFAULT 10 NOT NULL,
	`moral` integer DEFAULT 100 NOT NULL,
	`energy` integer DEFAULT 100 NOT NULL,
	`fitness` integer DEFAULT 100 NOT NULL,
	`form` integer DEFAULT 50 NOT NULL,
	`is_youth` integer DEFAULT false NOT NULL,
	`is_injured` integer DEFAULT false NOT NULL,
	`injury_type` text,
	`injury_days_remaining` integer DEFAULT 0 NOT NULL,
	`is_captain` integer DEFAULT false NOT NULL,
	`suspension_games_remaining` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_players`("id", "team_id", "first_name", "last_name", "age", "nationality", "position", "preferred_foot", "overall", "potential", "finishing", "passing", "dribbling", "defending", "shooting", "physical", "pace", "moral", "energy", "fitness", "form", "is_youth", "is_injured", "injury_type", "injury_days_remaining", "is_captain", "suspension_games_remaining") SELECT "id", "team_id", "first_name", "last_name", "age", "nationality", "position", "preferred_foot", "overall", "potential", "finishing", "passing", "dribbling", "defending", "shooting", "physical", "pace", "moral", "energy", "fitness", "form", "is_youth", "is_injured", "injury_type", "injury_days_remaining", "is_captain", "suspension_games_remaining" FROM `players`;--> statement-breakpoint
DROP TABLE `players`;--> statement-breakpoint
ALTER TABLE `__new_players` RENAME TO `players`;--> statement-breakpoint
CREATE TABLE `__new_scouting_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer,
	`scout_id` integer,
	`team_id` integer,
	`date` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`overall_estimate` integer,
	`potential_estimate` integer,
	`notes` text,
	`recommendation` text,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scout_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_scouting_reports`("id", "player_id", "scout_id", "team_id", "date", "progress", "overall_estimate", "potential_estimate", "notes", "recommendation") SELECT "id", "player_id", "scout_id", "team_id", "date", "progress", "overall_estimate", "potential_estimate", "notes", "recommendation" FROM `scouting_reports`;--> statement-breakpoint
DROP TABLE `scouting_reports`;--> statement-breakpoint
ALTER TABLE `__new_scouting_reports` RENAME TO `scouting_reports`;--> statement-breakpoint
CREATE TABLE `__new_seasons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`year` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_seasons`("id", "year", "start_date", "end_date", "is_active") SELECT "id", "year", "start_date", "end_date", "is_active" FROM `seasons`;--> statement-breakpoint
DROP TABLE `seasons`;--> statement-breakpoint
ALTER TABLE `__new_seasons` RENAME TO `seasons`;--> statement-breakpoint
CREATE TABLE `__new_staff` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`age` integer NOT NULL,
	`nationality` text DEFAULT 'BRA' NOT NULL,
	`role` text NOT NULL,
	`overall` integer NOT NULL,
	`salary` real DEFAULT 0 NOT NULL,
	`contract_end` text,
	`specialization` text,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_staff`("id", "team_id", "first_name", "last_name", "age", "nationality", "role", "overall", "salary", "contract_end", "specialization") SELECT "id", "team_id", "first_name", "last_name", "age", "nationality", "role", "overall", "salary", "contract_end", "specialization" FROM `staff`;--> statement-breakpoint
DROP TABLE `staff`;--> statement-breakpoint
ALTER TABLE `__new_staff` RENAME TO `staff`;--> statement-breakpoint
CREATE TABLE `__new_teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`primary_color` text DEFAULT '#000000' NOT NULL,
	`secondary_color` text DEFAULT '#ffffff' NOT NULL,
	`reputation` integer DEFAULT 0 NOT NULL,
	`budget` real DEFAULT 0 NOT NULL,
	`is_human` integer DEFAULT false NOT NULL,
	`stadium_capacity` integer DEFAULT 10000 NOT NULL,
	`stadium_quality` integer DEFAULT 50 NOT NULL,
	`training_center_quality` integer DEFAULT 50 NOT NULL,
	`youth_academy_quality` integer DEFAULT 50 NOT NULL,
	`fan_satisfaction` integer DEFAULT 50 NOT NULL,
	`fan_base` integer DEFAULT 10000 NOT NULL,
	`head_coach_id` integer,
	`football_director_id` integer,
	`executive_director_id` integer,
	`transfer_budget` real DEFAULT 0 NOT NULL,
	`transfer_strategy` text DEFAULT 'balanced' NOT NULL,
	`history` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_teams`("id", "name", "short_name", "primary_color", "secondary_color", "reputation", "budget", "is_human", "stadium_capacity", "stadium_quality", "training_center_quality", "youth_academy_quality", "fan_satisfaction", "fan_base", "head_coach_id", "football_director_id", "executive_director_id", "transfer_budget", "transfer_strategy", "history") SELECT "id", "name", "short_name", "primary_color", "secondary_color", "reputation", "budget", "is_human", "stadium_capacity", "stadium_quality", "training_center_quality", "youth_academy_quality", "fan_satisfaction", "fan_base", "head_coach_id", "football_director_id", "executive_director_id", "transfer_budget", "transfer_strategy", "history" FROM `teams`;--> statement-breakpoint
DROP TABLE `teams`;--> statement-breakpoint
ALTER TABLE `__new_teams` RENAME TO `teams`;--> statement-breakpoint
CREATE TABLE `__new_transfers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer,
	`from_team_id` integer,
	`to_team_id` integer,
	`fee` real DEFAULT 0 NOT NULL,
	`date` text NOT NULL,
	`season_id` integer,
	`type` text DEFAULT 'transfer' NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_transfers`("id", "player_id", "from_team_id", "to_team_id", "fee", "date", "season_id", "type") SELECT "id", "player_id", "from_team_id", "to_team_id", "fee", "date", "season_id", "type" FROM `transfers`;--> statement-breakpoint
DROP TABLE `transfers`;--> statement-breakpoint
ALTER TABLE `__new_transfers` RENAME TO `transfers`;