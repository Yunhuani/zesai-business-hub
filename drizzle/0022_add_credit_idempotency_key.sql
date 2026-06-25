ALTER TABLE `creditsTransactions`
	ADD COLUMN `idempotencyKey` varchar(128) AFTER `billingKey`,
	ADD UNIQUE KEY `creditsTransactions_idempotency_unique` (`idempotencyKey`);
