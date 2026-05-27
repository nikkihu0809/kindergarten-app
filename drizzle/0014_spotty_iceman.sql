ALTER TABLE `meetings` ADD `chairperson` varchar(64) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `meetings` ADD `absentees` varchar(500) DEFAULT '' NOT NULL;