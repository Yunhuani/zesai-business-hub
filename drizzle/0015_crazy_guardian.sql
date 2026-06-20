CREATE TABLE `smsLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`type` enum('login','register','bind') NOT NULL DEFAULT 'login',
	`code` varchar(6) NOT NULL,
	`status` enum('pending','success','failed') NOT NULL DEFAULT 'pending',
	`aliyunCode` varchar(20),
	`aliyunMessage` text,
	`errorReason` text,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
CREATE INDEX `smsLogs_phone_idx` ON `smsLogs` (`phone`);--> statement-breakpoint
CREATE INDEX `smsLogs_status_idx` ON `smsLogs` (`status`);