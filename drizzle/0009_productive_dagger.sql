CREATE TABLE `generatedDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`conversationId` int NOT NULL,
	`agentId` int NOT NULL,
	`fileId` varchar(100) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` enum('heavy','medium','light') NOT NULL,
	`format` enum('pdf','word') NOT NULL,
	`fileUrl` text,
	`fileSize` int,
	`status` enum('pending','generating','completed','failed') NOT NULL DEFAULT 'pending',
	`creditsDeducted` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `generatedDocuments_id` PRIMARY KEY(`id`)
);
