ALTER TABLE `questions` ADD `kind` text DEFAULT 'choice' NOT NULL;--> statement-breakpoint
ALTER TABLE `votes` ADD `answer_text` text;