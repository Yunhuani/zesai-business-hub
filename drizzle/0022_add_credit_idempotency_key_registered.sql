ALTER TABLE `creditsTransactions`
	ADD COLUMN `idempotencyKey` varchar(128) AFTER `billingKey`;
--> statement-breakpoint
ALTER TABLE `creditsTransactions`
	ADD UNIQUE KEY `creditsTransactions_idempotency_unique` (`idempotencyKey`);
