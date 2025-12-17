CREATE TABLE `match_tactics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`is_home` integer NOT NULL,
	`formation` text DEFAULT '4-4-2' NOT NULL,
	`game_style` text DEFAULT 'balanced' NOT NULL,
	`marking` text DEFAULT 'man_to_man' NOT NULL,
	`mentality` text DEFAULT 'normal' NOT NULL,
	`passing_directness` text DEFAULT 'mixed' NOT NULL,
	`starting_lineup` text DEFAULT '[]' NOT NULL,
	`bench` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_match_tactics_match` ON `match_tactics` (`match_id`);--> statement-breakpoint
CREATE INDEX `idx_match_tactics_team` ON `match_tactics` (`team_id`);--> statement-breakpoint
CREATE TABLE `scheduled_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`processed` integer DEFAULT false NOT NULL,
	`metadata` text,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_scheduled_events_date` ON `scheduled_events` (`date`);--> statement-breakpoint
CREATE INDEX `idx_scheduled_events_processed` ON `scheduled_events` (`processed`);--> statement-breakpoint
ALTER TABLE `game_state` ADD `player_formation` text DEFAULT '4-4-2';--> statement-breakpoint
ALTER TABLE `game_state` ADD `player_game_style` text DEFAULT 'balanced';--> statement-breakpoint
ALTER TABLE `game_state` ADD `player_marking` text DEFAULT 'man_to_man';--> statement-breakpoint
ALTER TABLE `game_state` ADD `player_mentality` text DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE `game_state` ADD `player_passing_directness` text DEFAULT 'mixed';--> statement-breakpoint
ALTER TABLE `players` ADD `birth_date` text;--> statement-breakpoint
ALTER TABLE `teams` ADD `default_formation` text DEFAULT '4-4-2' NOT NULL;--> statement-breakpoint
ALTER TABLE `teams` ADD `default_game_style` text DEFAULT 'balanced' NOT NULL;--> statement-breakpoint
ALTER TABLE `teams` ADD `default_marking` text DEFAULT 'man_to_man' NOT NULL;--> statement-breakpoint
ALTER TABLE `teams` ADD `default_mentality` text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `teams` ADD `default_passing_directness` text DEFAULT 'mixed' NOT NULL;