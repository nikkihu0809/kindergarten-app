CREATE TABLE `lesson_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activityName` varchar(200) NOT NULL,
	`subject` varchar(100) NOT NULL,
	`dateRange` varchar(50) NOT NULL,
	`ages` varchar(200) NOT NULL DEFAULT '0-6個月,7-12個月,13-24個月,25-36個月',
	`designer` varchar(64) NOT NULL DEFAULT '',
	`objectives` text,
	`resources` text,
	`process` text,
	`extension` text,
	`reflection` text,
	`notes` varchar(2000) NOT NULL DEFAULT '',
	`wordFileUrl` varchar(1000) NOT NULL DEFAULT '',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lesson_plans_id` PRIMARY KEY(`id`)
);
