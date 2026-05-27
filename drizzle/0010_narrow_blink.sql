CREATE TABLE `stat_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`statusLabel` varchar(64) NOT NULL DEFAULT '已完成',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stat_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stat_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`statItemId` int NOT NULL,
	`studentId` int NOT NULL,
	`studentName` varchar(64) NOT NULL,
	`className` varchar(64) NOT NULL,
	`checked` int NOT NULL DEFAULT 0,
	`notes` varchar(1000) NOT NULL DEFAULT '',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stat_records_id` PRIMARY KEY(`id`)
);
