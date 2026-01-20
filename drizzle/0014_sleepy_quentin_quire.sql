CREATE TABLE `smsCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`code` varchar(6) NOT NULL,
	`type` enum('login','register','bind') NOT NULL DEFAULT 'login',
	`used` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
CREATE INDEX `smsCodes_phone_idx` ON `smsCodes` (`phone`);--> statement-breakpoint
CREATE INDEX `users_phone_unique` ON `users` (`phone`);