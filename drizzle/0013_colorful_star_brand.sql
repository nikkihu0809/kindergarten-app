CREATE TABLE `meeting_motions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int NOT NULL,
	`topic` varchar(500) NOT NULL,
	`resolution` varchar(2000) NOT NULL DEFAULT '',
	`assigneeId` int,
	`assigneeName` varchar(64) NOT NULL DEFAULT '',
	`dueDate` varchar(10) NOT NULL DEFAULT '',
	`status` varchar(32) NOT NULL DEFAULT '待處理',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meeting_motions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`meetingDate` varchar(10) NOT NULL,
	`meetingTime` varchar(20) NOT NULL DEFAULT '',
	`location` varchar(200) NOT NULL DEFAULT '',
	`attendeeIds` text,
	`recorder` varchar(64) NOT NULL DEFAULT '',
	`thisWeekStart` varchar(10) NOT NULL DEFAULT '',
	`thisWeekEnd` varchar(10) NOT NULL DEFAULT '',
	`lastWeekStart` varchar(10) NOT NULL DEFAULT '',
	`lastWeekEnd` varchar(10) NOT NULL DEFAULT '',
	`reportData` text,
	`wordFileUrl` varchar(1000) NOT NULL DEFAULT '',
	`trackingStatus` varchar(32) NOT NULL DEFAULT '待追蹤',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meetings_id` PRIMARY KEY(`id`)
);
