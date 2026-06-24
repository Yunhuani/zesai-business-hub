ALTER TABLE `diagnoses`
	ADD COLUMN `productType` enum('preview','full') NOT NULL DEFAULT 'preview' AFTER `userId`,
	ADD COLUMN `fullCreditsDeducted` int NOT NULL DEFAULT 0 AFTER `scoreLabel`,
	ADD COLUMN `pdfPurchased` int NOT NULL DEFAULT 0 AFTER `fullCreditsDeducted`,
	ADD COLUMN `pdfCreditsDeducted` int NOT NULL DEFAULT 0 AFTER `pdfPurchased`;
--> statement-breakpoint
ALTER TABLE `creditsTransactions`
	ADD COLUMN `relatedDiagnosisId` int AFTER `relatedOrderId`,
	ADD COLUMN `billingKey` varchar(50) AFTER `relatedDiagnosisId`,
	ADD UNIQUE KEY `creditsTransactions_diagnosis_billing_unique`
		(`relatedDiagnosisId`, `billingKey`);
