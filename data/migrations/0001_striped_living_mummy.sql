CREATE TABLE `player_contracts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`wage` real NOT NULL,
	`release_clause` real,
	`type` text DEFAULT 'professional',
	`status` text DEFAULT 'active',
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_players` (
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
	`finishing` integer DEFAULT 10,
	`passing` integer DEFAULT 10,
	`dribbling` integer DEFAULT 10,
	`defending` integer DEFAULT 10,
	`shooting` integer DEFAULT 10,
	`physical` integer DEFAULT 10,
	`pace` integer DEFAULT 10,
	`moral` integer DEFAULT 100,
	`energy` integer DEFAULT 100,
	`fitness` integer DEFAULT 100,
	`form` integer DEFAULT 50,
	`is_youth` integer DEFAULT false,
	`is_injured` integer DEFAULT false,
	`injury_type` text,
	`injury_days_remaining` integer DEFAULT 0,
	`is_captain` integer DEFAULT false,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_players`("id", "team_id", "first_name", "last_name", "age", "nationality", "position", "preferred_foot", "overall", "potential", "finishing", "passing", "dribbling", "defending", "shooting", "physical", "pace", "moral", "energy", "fitness", "form", "is_youth", "is_injured", "injury_type", "injury_days_remaining", "is_captain") SELECT "id", "team_id", "first_name", "last_name", "age", "nationality", "position", "preferred_foot", "overall", "potential", "finishing", "passing", "dribbling", "defending", "shooting", "physical", "pace", "moral", "energy", "fitness", "form", "is_youth", "is_injured", "injury_type", "injury_days_remaining", "is_captain" FROM `players`;--> statement-breakpoint
DROP TABLE `players`;--> statement-breakpoint
ALTER TABLE `__new_players` RENAME TO `players`;--> statement-breakpoint
PRAGMA foreign_keys=ON;