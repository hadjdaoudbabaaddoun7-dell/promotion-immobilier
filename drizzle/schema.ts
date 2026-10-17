import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  displayName: varchar("displayName", { length: 120 }),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const workspaces = mysqlTable("workspaces", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const workspaceMembers = mysqlTable("workspace_members", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceRole: mysqlEnum("workspaceRole", ["admin", "member"]).default("member").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("workspace_member_unique").on(table.workspaceId, table.userId)]);

export const workspaceInvitations = mysqlTable("workspace_invitations", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 320 }).notNull(),
  workspaceRole: mysqlEnum("workspaceRole", ["admin", "member"]).default("member").notNull(),
  invitedByUserId: int("invitedByUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  acceptedAt: timestamp("acceptedAt"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("workspace_invitation_unique").on(table.workspaceId, table.email)]);

export const retentionSchedules = mysqlTable("retention_schedules", {
  id: int("id").autoincrement().primaryKey(),
  taskKey: varchar("taskKey", { length: 48 }).notNull().unique(),
  taskUid: varchar("taskUid", { length: 65 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const intakeForms = mysqlTable("intake_forms", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  offlineClientId: varchar("offlineClientId", { length: 96 }).unique(),
  lifecycleState: mysqlEnum("lifecycleState", ["active", "archived", "trashed"]).default("active").notNull(),
  trashedAt: timestamp("trashedAt"),
  projectName: varchar("projectName", { length: 180 }).notNull(),
  projectLocation: varchar("projectLocation", { length: 180 }).notNull(),
  submissionDate: varchar("submissionDate", { length: 10 }).notNull(),
  basements: varchar("basements", { length: 6 }).notNull(),
  mezzanines: varchar("mezzanines", { length: 6 }).notNull(),
  commercialGroundFloor: boolean("commercialGroundFloor").default(false).notNull(),
  residentialGroundFloor: boolean("residentialGroundFloor").default(false).notNull(),
  serviceMezzanine: boolean("serviceMezzanine").default(false).notNull(),
  serviceFloors: varchar("serviceFloors", { length: 6 }).notNull(),
  landscapedTerrace: boolean("landscapedTerrace").default(false).notNull(),
  ces: varchar("ces", { length: 12 }).notNull(),
  cos: varchar("cos", { length: 12 }).notNull(),
  housingF2: boolean("housingF2").default(false).notNull(),
  housingF3: boolean("housingF3").default(false).notNull(),
  housingF4: boolean("housingF4").default(false).notNull(),
  housingF5: boolean("housingF5").default(false).notNull(),
  housingDuplex: boolean("housingDuplex").default(false).notNull(),
  housingOther: boolean("housingOther").default(false).notNull(),
  standing: mysqlEnum("standing", ["Normal", "Moyen", "Haut"]).notNull(),
  parking: boolean("parking").default(false).notNull(),
  elevator: boolean("elevator").default(false).notNull(),
  playground: boolean("playground").default(false).notNull(),
  security: boolean("security").default(false).notNull(),
  smartHome: boolean("smartHome").default(false).notNull(),
  otherEquipment: varchar("otherEquipment", { length: 250 }).notNull(),
  specialInstructions: text("specialInstructions").notNull(),
  cadastralPlan: boolean("cadastralPlan").default(false).notNull(),
  urbanPlanningCertificate: boolean("urbanPlanningCertificate").default(false).notNull(),
  titleDeed: boolean("titleDeed").default(false).notNull(),
  landRegistryBook: boolean("landRegistryBook").default(false).notNull(),
  otherDocument: boolean("otherDocument").default(false).notNull(),
  transmissionDate: varchar("transmissionDate", { length: 10 }).notNull(),
  senderSignature: varchar("senderSignature", { length: 160 }).notNull(),
  receptionDate: varchar("receptionDate", { length: 10 }).notNull(),
  recipientSignature: varchar("recipientSignature", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const intakeFormShares = mysqlTable("intake_form_shares", {
  id: int("id").autoincrement().primaryKey(),
  intakeFormId: int("intakeFormId").notNull().unique().references(() => intakeForms.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  permission: mysqlEnum("permission", ["view", "edit"]).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const intakeFormHistory = mysqlTable("intake_form_history", {
  id: int("id").autoincrement().primaryKey(),
  intakeFormId: int("intakeFormId").notNull().references(() => intakeForms.id, { onDelete: "cascade" }),
  action: mysqlEnum("action", ["created", "updated", "archived", "restored", "trashed", "transferred"]).notNull(),
  actorUserId: int("actorUserId").references(() => users.id, { onDelete: "set null" }),
  actorDisplayName: varchar("actorDisplayName", { length: 120 }).notNull(),
  diffJson: text("diffJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type IntakeForm = typeof intakeForms.$inferSelect;
export type InsertIntakeForm = typeof intakeForms.$inferInsert;
export type IntakeFormShare = typeof intakeFormShares.$inferSelect;
export type IntakeFormHistory = typeof intakeFormHistory.$inferSelect;
