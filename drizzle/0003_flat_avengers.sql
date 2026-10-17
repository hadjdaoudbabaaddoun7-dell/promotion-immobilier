ALTER TABLE `users` ADD `displayName` varchar(120);
--> statement-breakpoint
CREATE TABLE `workspaces` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(120) NOT NULL,
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `workspaces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspace_members` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `userId` int NOT NULL,
  `workspaceRole` enum('admin','member') NOT NULL DEFAULT 'member',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `workspace_members_id` PRIMARY KEY(`id`),
  CONSTRAINT `workspace_member_unique` UNIQUE(`workspaceId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `workspace_invitations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `email` varchar(320) NOT NULL,
  `workspaceRole` enum('admin','member') NOT NULL DEFAULT 'member',
  `invitedByUserId` int NOT NULL,
  `acceptedAt` timestamp,
  `revokedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `workspace_invitations_id` PRIMARY KEY(`id`),
  CONSTRAINT `workspace_invitation_unique` UNIQUE(`workspaceId`,`email`)
);
--> statement-breakpoint
CREATE TABLE `retention_schedules` (
  `id` int AUTO_INCREMENT NOT NULL,
  `taskKey` varchar(48) NOT NULL,
  `taskUid` varchar(65),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `retention_schedules_id` PRIMARY KEY(`id`),
  CONSTRAINT `retention_schedules_taskKey_unique` UNIQUE(`taskKey`),
  CONSTRAINT `retention_schedules_taskUid_unique` UNIQUE(`taskUid`)
);
--> statement-breakpoint
CREATE TABLE `intake_form_history` (
  `id` int AUTO_INCREMENT NOT NULL,
  `intakeFormId` int NOT NULL,
  `action` enum('created','updated','archived','restored','trashed','transferred') NOT NULL,
  `actorUserId` int,
  `actorDisplayName` varchar(120) NOT NULL,
  `diffJson` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `intake_form_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `intake_forms` ADD `workspaceId` int;
--> statement-breakpoint
INSERT INTO `workspaces` (`name`, `createdByUserId`)
SELECT LEFT(CONCAT('Espace de ', COALESCE(NULLIF(`displayName`, ''), NULLIF(`name`, ''), 'Utilisateur')), 120), `id`
FROM `users`;
--> statement-breakpoint
INSERT INTO `workspace_members` (`workspaceId`, `userId`, `workspaceRole`)
SELECT `workspaces`.`id`, `users`.`id`, 'admin'
FROM `workspaces`
INNER JOIN `users` ON `workspaces`.`createdByUserId` = `users`.`id`;
--> statement-breakpoint
UPDATE `intake_forms`
INNER JOIN `workspaces` ON `workspaces`.`createdByUserId` = `intake_forms`.`ownerId`
SET `intake_forms`.`workspaceId` = `workspaces`.`id`;
--> statement-breakpoint
ALTER TABLE `intake_forms` MODIFY `workspaceId` int NOT NULL;
--> statement-breakpoint
ALTER TABLE `intake_forms` ADD `lifecycleState` enum('active','archived','trashed') DEFAULT 'active' NOT NULL;
--> statement-breakpoint
ALTER TABLE `intake_forms` ADD `trashedAt` timestamp;
--> statement-breakpoint
ALTER TABLE `workspaces` ADD CONSTRAINT `workspaces_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `workspace_members` ADD CONSTRAINT `workspace_members_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `workspace_members` ADD CONSTRAINT `workspace_members_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `workspace_invitations` ADD CONSTRAINT `workspace_invitations_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `workspace_invitations` ADD CONSTRAINT `workspace_invitations_invitedByUserId_users_id_fk` FOREIGN KEY (`invitedByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `intake_forms` ADD CONSTRAINT `intake_forms_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `intake_form_history` ADD CONSTRAINT `intake_form_history_intakeFormId_intake_forms_id_fk` FOREIGN KEY (`intakeFormId`) REFERENCES `intake_forms`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `intake_form_history` ADD CONSTRAINT `intake_form_history_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
