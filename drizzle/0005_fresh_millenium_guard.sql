CREATE TABLE `creditsTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('consume','purchase','subscription_grant','refund') NOT NULL,
	`amount` int NOT NULL,
	`balancePurchased` int NOT NULL,
	`balanceSubscription` int NOT NULL,
	`description` text NOT NULL,
	`relatedOrderId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creditsTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `creditsPurchased` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `creditsSubscription` int DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `creditsResetDate` timestamp DEFAULT (now()) NOT NULL;