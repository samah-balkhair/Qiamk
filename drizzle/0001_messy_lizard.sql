CREATE TABLE `coreValues` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT true,
	`createdBy` varchar(64),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `coreValues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finalResults` (
	`id` varchar(64) NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`topValue1Id` varchar(64) NOT NULL,
	`topValue1Definition` text,
	`topValue2Id` varchar(64) NOT NULL,
	`topValue2Definition` text,
	`topValue3Id` varchar(64) NOT NULL,
	`topValue3Definition` text,
	`sentToGhl` boolean DEFAULT false,
	`emailSent` boolean DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `finalResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `initialComparisons` (
	`id` varchar(64) NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`value1Id` varchar(64) NOT NULL,
	`value2Id` varchar(64) NOT NULL,
	`selectedValueId` varchar(64) NOT NULL,
	`comparisonRound` int NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `initialComparisons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scenarios` (
	`id` varchar(64) NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`value1Id` varchar(64) NOT NULL,
	`value1Definition` text,
	`value2Id` varchar(64) NOT NULL,
	`value2Definition` text,
	`scenarioText` text NOT NULL,
	`selectedValueId` varchar(64),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `scenarios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `selectedValues` (
	`id` varchar(64) NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`valueId` varchar(64) NOT NULL,
	`definition` text,
	`initialScore` int DEFAULT 0,
	`finalScore` int DEFAULT 0,
	`rank` int,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `selectedValues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`currentPage` int NOT NULL DEFAULT 1,
	`status` enum('active','completed') NOT NULL DEFAULT 'active',
	`createdAt` timestamp DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);