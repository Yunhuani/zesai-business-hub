CREATE TABLE `pricingConfig` (
	`id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`configKey` varchar(100) NOT NULL,
	`category` enum('action','subscription','credit_pack') NOT NULL,
	`name` varchar(100) NOT NULL,
	`credits` int,
	`priceCents` int,
	`monthlyCredits` int,
	`durationDays` int,
	`permanent` int NOT NULL DEFAULT 0,
	`enabled` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	UNIQUE KEY `pricingConfig_configKey_unique` (`configKey`)
);
--> statement-breakpoint
INSERT INTO `pricingConfig`
	(`configKey`, `category`, `name`, `credits`, `priceCents`, `monthlyCredits`, `durationDays`, `permanent`)
VALUES
	('action.chat', 'action', '对话', 10, NULL, NULL, NULL, 0),
	('action.quick_analysis', 'action', '快速分析', 200, NULL, NULL, NULL, 0),
	('action.diagnosis_full', 'action', '诊断（在线生成查看）', 1500, NULL, NULL, NULL, 0),
	('action.diagnosis_pdf', 'action', '诊断下载 PDF', 500, NULL, NULL, NULL, 0),
	('action.business_plan', 'action', '商业计划书', 1800, NULL, NULL, NULL, 0),
	('action.equity_structure', 'action', '股权架构', 1800, NULL, NULL, NULL, 0),
	('action.report_redownload', 'action', '重下已购报告', 0, NULL, NULL, NULL, 0),
	('subscription.free', 'subscription', '免费版', NULL, 0, 0, 30, 0),
	('subscription.basic', 'subscription', '基础版', NULL, 9900, 1800, 30, 0),
	('subscription.professional', 'subscription', '专业版', NULL, 49900, 6000, 30, 0),
	('subscription.enterprise', 'subscription', '旗舰版', NULL, 99900, 15000, 30, 0),
	('credit_pack.pack_500', 'credit_pack', '入门包', 500, 4900, NULL, NULL, 1),
	('credit_pack.pack_1200', 'credit_pack', '超值包', 1200, 9900, NULL, NULL, 1),
	('credit_pack.pack_3000', 'credit_pack', '专业包', 3000, 19900, NULL, NULL, 1),
	('credit_pack.pack_8000', 'credit_pack', '企业包', 8000, 39900, NULL, NULL, 1)
ON DUPLICATE KEY UPDATE
	`category` = VALUES(`category`),
	`name` = VALUES(`name`),
	`credits` = VALUES(`credits`),
	`priceCents` = VALUES(`priceCents`),
	`monthlyCredits` = VALUES(`monthlyCredits`),
	`durationDays` = VALUES(`durationDays`),
	`permanent` = VALUES(`permanent`),
	`enabled` = 1;
