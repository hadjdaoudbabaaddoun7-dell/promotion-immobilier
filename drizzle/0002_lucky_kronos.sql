CREATE TABLE `intake_form_shares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`intakeFormId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`permission` enum('view','edit') NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `intake_form_shares_id` PRIMARY KEY(`id`),
	CONSTRAINT `intake_form_shares_intakeFormId_unique` UNIQUE(`intakeFormId`),
	CONSTRAINT `intake_form_shares_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `intake_form_shares` ADD CONSTRAINT `intake_form_shares_intakeFormId_intake_forms_id_fk` FOREIGN KEY (`intakeFormId`) REFERENCES `intake_forms`(`id`) ON DELETE cascade ON UPDATE no action;