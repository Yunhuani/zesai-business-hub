CREATE TABLE `pptDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`inputText` text NOT NULL,
	`themeStyle` varchar(50) NOT NULL DEFAULT 'business',
	`colorScheme` varchar(50) NOT NULL DEFAULT 'forest_gold',
	`slideCount` int NOT NULL DEFAULT 0,
	`fileUrl` text,
	`fileSize` int,
	`status` enum('pending','structuring','rendering','assembling','uploading','completed','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`creditsDeducted` int NOT NULL DEFAULT 0,
	`outlineJson` text,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `pptDocuments_userId_idx` ON `pptDocuments` (`userId`);--> statement-breakpoint
CREATE INDEX `pptDocuments_status_idx` ON `pptDocuments` (`status`);