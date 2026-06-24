CREATE TABLE `diagnoses` (
	`id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`userId` int NOT NULL,
	`intake` json NOT NULL,
	`status` enum('pending','running','done','error') NOT NULL DEFAULT 'pending',
	`result` json,
	`headline` varchar(255),
	`overallScore` decimal(5,2),
	`scoreLabel` varchar(50),
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
