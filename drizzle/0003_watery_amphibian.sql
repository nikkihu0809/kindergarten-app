CREATE TABLE `incident_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`className` varchar(64) NOT NULL,
	`studentId` int NOT NULL,
	`studentName` varchar(64) NOT NULL,
	`description` varchar(2000) NOT NULL DEFAULT '',
	`time` varchar(8) NOT NULL DEFAULT '',
	`location` varchar(500) NOT NULL DEFAULT '',
	`parentResponse` varchar(2000) NOT NULL DEFAULT '',
	`handler` varchar(64) NOT NULL DEFAULT '',
	`photoUrls` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `incident_reports_id` PRIMARY KEY(`id`)
);
