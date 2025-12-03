CREATE TABLE `competition_standings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`competition_id` integer,
	`season_id` integer,
	`team_id` integer,
	`played` integer DEFAULT 0,
	`wins` integer DEFAULT 0,
	`draws` integer DEFAULT 0,
	`losses` integer DEFAULT 0,
	`goals_for` integer DEFAULT 0,
	`goals_against` integer DEFAULT 0,
	`points` integer DEFAULT 0,
	FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `competitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`country` text NOT NULL,
	`tier` integer DEFAULT 1,
	`format` text NOT NULL,
	`teams` integer DEFAULT 20,
	`prize` real DEFAULT 0,
	`reputation` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `financial_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer,
	`season_id` integer,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`amount` real NOT NULL,
	`description` text,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `game_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`current_date` text NOT NULL,
	`current_season_id` integer,
	`manager_name` text DEFAULT 'Treinador',
	`player_team_id` integer,
	`simulation_speed` integer DEFAULT 1,
	FOREIGN KEY (`current_season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `match_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer,
	`minute` integer NOT NULL,
	`type` text NOT NULL,
	`team_id` integer,
	`player_id` integer,
	`description` text,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`competition_id` integer,
	`season_id` integer,
	`home_team_id` integer,
	`away_team_id` integer,
	`date` text NOT NULL,
	`round` integer,
	`home_score` integer,
	`away_score` integer,
	`is_played` integer DEFAULT false,
	`attendance` integer,
	`ticket_revenue` real,
	`weather` text,
	FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`home_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`away_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`age` integer NOT NULL,
	`nationality` text DEFAULT 'BRA',
	`position` text NOT NULL,
	`preferred_foot` text DEFAULT 'right',
	`overall` integer NOT NULL,
	`potential` integer NOT NULL,
	`finishing` integer DEFAULT 50,
	`passing` integer DEFAULT 50,
	`dribbling` integer DEFAULT 50,
	`defending` integer DEFAULT 50,
	`physical` integer DEFAULT 50,
	`pace` integer DEFAULT 50,
	`shooting` integer DEFAULT 50,
	`moral` integer DEFAULT 100,
	`energy` integer DEFAULT 100,
	`fitness` integer DEFAULT 100,
	`form` integer DEFAULT 50,
	`salary` real DEFAULT 0,
	`contract_end` text,
	`release_clause` real,
	`is_fully_scouted` integer DEFAULT false,
	`scouting_progress` integer DEFAULT 0,
	`is_youth` integer DEFAULT false,
	`youth_level` text,
	`is_injured` integer DEFAULT false,
	`injury_type` text,
	`injury_days_remaining` integer DEFAULT 0,
	`yellow_cards` integer DEFAULT 0,
	`red_cards` integer DEFAULT 0,
	`suspension_games_remaining` integer DEFAULT 0,
	`is_captain` integer DEFAULT false,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `scouting_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer,
	`scout_id` integer,
	`team_id` integer,
	`date` text NOT NULL,
	`progress` integer DEFAULT 0,
	`overall_estimate` integer,
	`potential_estimate` integer,
	`notes` text,
	`recommendation` text,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scout_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`year` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`is_active` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`age` integer NOT NULL,
	`nationality` text DEFAULT 'BRA',
	`role` text NOT NULL,
	`overall` integer NOT NULL,
	`salary` real DEFAULT 0,
	`contract_end` text,
	`specialization` text,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`primary_color` text DEFAULT '#000000',
	`secondary_color` text DEFAULT '#ffffff',
	`reputation` integer DEFAULT 0,
	`budget` real DEFAULT 0,
	`is_human` integer DEFAULT false,
	`stadium_capacity` integer DEFAULT 10000,
	`stadium_quality` integer DEFAULT 50,
	`training_center_quality` integer DEFAULT 50,
	`youth_academy_quality` integer DEFAULT 50,
	`fan_satisfaction` integer DEFAULT 50,
	`fan_base` integer DEFAULT 10000,
	`head_coach_id` integer,
	`football_director_id` integer,
	`executive_director_id` integer
);
--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer,
	`from_team_id` integer,
	`to_team_id` integer,
	`fee` real DEFAULT 0,
	`date` text NOT NULL,
	`season_id` integer,
	`type` text DEFAULT 'transfer',
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action
);
