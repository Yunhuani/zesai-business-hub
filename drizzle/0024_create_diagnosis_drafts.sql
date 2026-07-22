CREATE TABLE `diagnosisDrafts` (
	`id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`userId` int NOT NULL,
	`flowKey` varchar(64) NOT NULL,
	`payload` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `diagnosisDrafts_user_flow_unique` UNIQUE(`userId`, `flowKey`)
);
