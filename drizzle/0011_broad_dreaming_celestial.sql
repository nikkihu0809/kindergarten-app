CREATE TABLE `growth_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`month` varchar(7) NOT NULL,
	`studentId` int NOT NULL,
	`studentName` varchar(64) NOT NULL,
	`className` varchar(64) NOT NULL,
	`height` varchar(10) NOT NULL DEFAULT '',
	`weight` varchar(10) NOT NULL DEFAULT '',
	`headCircumference` varchar(10) NOT NULL DEFAULT '',
	`footLength` varchar(10) NOT NULL DEFAULT '',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `growth_records_id` PRIMARY KEY(`id`)
);
