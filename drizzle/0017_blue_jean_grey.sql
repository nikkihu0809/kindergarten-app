CREATE TABLE `login_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`email` varchar(320) NOT NULL,
	`name` varchar(100) NOT NULL DEFAULT '',
	`loginMethod` varchar(64) NOT NULL DEFAULT '',
	`success` int NOT NULL DEFAULT 1,
	`failReason` varchar(255) NOT NULL DEFAULT '',
	`ipAddress` varchar(64) NOT NULL DEFAULT '',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','supervisor','admin') NOT NULL DEFAULT 'user';