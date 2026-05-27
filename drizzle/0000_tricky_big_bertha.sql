CREATE TABLE `daily_curriculum` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`courseContent` varchar(2000) NOT NULL DEFAULT '',
	`picturebook` varchar(500) NOT NULL DEFAULT '',
	`song` varchar(500) NOT NULL DEFAULT '',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_curriculum_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parent_communication` (
	`id` int AUTO_INCREMENT NOT NULL,
	`weekNumber` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`studentId` int NOT NULL,
	`studentName` varchar(64) NOT NULL,
	`method` enum('interview','phone') NOT NULL,
	`teacherShare` varchar(2000) NOT NULL DEFAULT '',
	`parentFeedback` varchar(2000) NOT NULL DEFAULT '',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `parent_communication_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`studentId` int NOT NULL,
	`studentName` varchar(64) NOT NULL,
	`type` enum('checkin','checkout','leave') NOT NULL,
	`time` varchar(8) NOT NULL DEFAULT '',
	`temperature` varchar(10) NOT NULL DEFAULT '',
	`leaveReason` varchar(500) NOT NULL DEFAULT '',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `student_attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`className` varchar(64) NOT NULL,
	`name` varchar(64) NOT NULL,
	`fatherPhone` varchar(32) NOT NULL DEFAULT '',
	`motherPhone` varchar(32) NOT NULL DEFAULT '',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `students_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teacher_leave` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`teacherId` int NOT NULL,
	`teacherName` varchar(64) NOT NULL,
	`leaveType` varchar(32) NOT NULL,
	`reason` varchar(500) NOT NULL DEFAULT '',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teacher_leave_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`title` varchar(64) NOT NULL DEFAULT '',
	`phone` varchar(32) NOT NULL DEFAULT '',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teachers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
