ALTER TABLE `users`
	MODIFY COLUMN `creditsSubscription` int NOT NULL DEFAULT 0,
	ADD COLUMN `trialCreditsGranted` int NOT NULL DEFAULT 0 AFTER `creditsSubscription`;
