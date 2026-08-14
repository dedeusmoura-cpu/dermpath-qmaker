CREATE TABLE `challenge_answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`challenge_id` integer NOT NULL,
	`question_id` integer NOT NULL,
	`participant_id` integer NOT NULL,
	`answer_index` integer NOT NULL,
	`is_correct` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`participant_id`) REFERENCES `challenge_participants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `challenge_answer_unique` ON `challenge_answers` (`participant_id`,`question_id`);--> statement-breakpoint
CREATE INDEX `challenge_answer_score` ON `challenge_answers` (`challenge_id`,`participant_id`);--> statement-breakpoint
CREATE TABLE `challenge_participants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`challenge_id` integer NOT NULL,
	`alias` text NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `challenge_participant_token_unique` ON `challenge_participants` (`token`);--> statement-breakpoint
CREATE INDEX `challenge_participant_challenge` ON `challenge_participants` (`challenge_id`);--> statement-breakpoint
CREATE TABLE `challenge_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`challenge_id` integer NOT NULL,
	`question_id` integer NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `challenge_question_unique` ON `challenge_questions` (`challenge_id`,`question_id`);--> statement-breakpoint
CREATE INDEX `challenge_question_position` ON `challenge_questions` (`challenge_id`,`position`);--> statement-breakpoint
CREATE TABLE `challenges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`created_at` integer NOT NULL
);
