CREATE TABLE `allowed_emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(100) NOT NULL DEFAULT '',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `allowed_emails_id` PRIMARY KEY(`id`),
	CONSTRAINT `allowed_emails_email_unique` UNIQUE(`email`)
);
