CREATE TABLE `businessPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`engineJobId` varchar(255),
	`intake` json NOT NULL,
	`status` enum('pending','running','done','error') NOT NULL DEFAULT 'pending',
	`result` json,
	`creditsDeducted` int NOT NULL DEFAULT 0,
	`retryCount` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businessPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
INSERT INTO `pricingConfig`
	(`configKey`, `category`, `name`, `credits`, `priceCents`, `monthlyCredits`, `durationDays`, `permanent`)
VALUES
	('action.business_plan', 'action', '商业计划书', 1500, NULL, NULL, NULL, 0)
ON DUPLICATE KEY UPDATE
	`category` = VALUES(`category`),
	`name` = VALUES(`name`),
	`credits` = VALUES(`credits`),
	`priceCents` = VALUES(`priceCents`),
	`monthlyCredits` = VALUES(`monthlyCredits`),
	`durationDays` = VALUES(`durationDays`),
	`permanent` = VALUES(`permanent`);
