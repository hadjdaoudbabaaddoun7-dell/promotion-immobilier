ALTER TABLE `intake_forms` ADD `offlineClientId` varchar(96);--> statement-breakpoint
ALTER TABLE `intake_forms` ADD CONSTRAINT `intake_forms_offlineClientId_unique` UNIQUE(`offlineClientId`);