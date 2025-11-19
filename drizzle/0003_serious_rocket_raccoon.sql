CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`outTradeNo` varchar(64) NOT NULL,
	`tradeNo` varchar(64),
	`plan` enum('free','basic','professional','enterprise') NOT NULL,
	`amount` int NOT NULL,
	`status` enum('pending','paid','cancelled','refunded') NOT NULL DEFAULT 'pending',
	`paymentMethod` varchar(20) NOT NULL DEFAULT 'alipay',
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_outTradeNo_unique` UNIQUE(`outTradeNo`)
);
