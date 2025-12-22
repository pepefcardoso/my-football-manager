PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
	`stadium_quality` integer DEFAULT 20 NOT NULL,
	`training_center_quality` integer DEFAULT 20 NOT NULL,
	`youth_academy_quality` integer DEFAULT 20 NOT NULL,
	`medical_center_quality` integer DEFAULT 20 NOT NULL,
	`administrative_center_quality` integer DEFAULT 20 NOT NULL,
	`active_construction` text DEFAULT 'null',
	`fan_satisfaction` integer DEFAULT 50 NOT NULL,
	`fan_base` integer DEFAULT 10000 NOT NULL,
	`head_coach_id` integer,
	`football_director_id` integer,
	`executive_director_id` integer,
	`transfer_budget` real DEFAULT 0 NOT NULL,
	`transfer_strategy` text DEFAULT 'balanced' NOT NULL,
	`history` text DEFAULT '[]' NOT NULL,
	`default_formation` text DEFAULT '4-4-2' NOT NULL,
	`default_game_style` text DEFAULT 'balanced' NOT NULL,
	`default_marking` text DEFAULT 'man_to_man' NOT NULL,
	`default_mentality` text DEFAULT 'normal' NOT NULL,
	`default_passing_directness` text DEFAULT 'mixed' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_teams`("id", "name", "short_name", "primary_color", "secondary_color", "reputation", "budget", "is_human", "stadium_capacity", "stadium_quality", "training_center_quality", "youth_academy_quality", "medical_center_quality", "administrative_center_quality", "active_construction", "fan_satisfaction", "fan_base", "head_coach_id", "football_director_id", "executive_director_id", "transfer_budget", "transfer_strategy", "history", "default_formation", "default_game_style", "default_marking", "default_mentality", "default_passing_directness") SELECT "id", "name", "short_name", "primary_color", "secondary_color", "reputation", "budget", "is_human", "stadium_capacity", "stadium_quality", "training_center_quality", "youth_academy_quality", "medical_center_quality", "administrative_center_quality", "active_construction", "fan_satisfaction", "fan_base", "head_coach_id", "football_director_id", "executive_director_id", "transfer_budget", "transfer_strategy", "history", "default_formation", "default_game_style", "default_marking", "default_mentality", "default_passing_directness" FROM `teams`;--> statement-breakpoint
DROP TABLE `teams`;--> statement-breakpoint
ALTER TABLE `__new_teams` RENAME TO `teams`;--> statement-breakpoint
PRAGMA foreign_keys=ON;