import { and, desc, eq, inArray, isNull, like, lt, ne, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomBytes } from "node:crypto";
import { IntakeFormInput, SharePermission } from "../shared/intake";
import {
  intakeFormHistory,
  intakeFormShares,
  intakeForms,
  InsertIntakeForm,
  InsertUser,
  retentionSchedules,
  users,
  workspaces,
  workspaceInvitations,
  workspaceMembers,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

type WorkspaceRole = "admin" | "member";
type LifecycleState = "active" | "archived" | "trashed";
type AuditAction = "created" | "updated" | "archived" | "restored" | "trashed" | "transferred";
type Actor = { userId: number | null; displayName: string };

type AuditField = { field: string; label: string; before: unknown; after: unknown };

const formFieldLabels: Record<keyof IntakeFormInput, string> = {
  projectName: "Nom du dossier",
  projectLocation: "Lieu",
  submissionDate: "Date de dépôt",
  basements: "Sous-sols",
  mezzanines: "Entre-sol",
  commercialGroundFloor: "RDC Commercial",
  residentialGroundFloor: "RDC Résidentiel",
  serviceMezzanine: "Entresol de service",
  serviceFloors: "Étages de service",
  landscapedTerrace: "Terrasse aménagée",
  ces: "CES",
  cos: "COS",
  housingF2: "F2",
  housingF3: "F3",
  housingF4: "F4",
  housingF5: "F5",
  housingDuplex: "Duplex",
  housingOther: "Autre logement",
  standing: "Standing",
  parking: "Parking",
  elevator: "Ascenseur",
  playground: "Aire de jeux",
  security: "Gardiennage",
  smartHome: "Smart Home",
  otherEquipment: "Autre équipement",
  specialInstructions: "Contraintes / Exigences",
  cadastralPlan: "Plan cadastral",
  urbanPlanningCertificate: "Certificat d’urbanisme",
  titleDeed: "Acte",
  landRegistryBook: "Livret foncier",
  otherDocument: "Autre document",
  transmissionDate: "Date de transmission",
  senderSignature: "Signataire émetteur",
  receptionDate: "Date de réception",
  recipientSignature: "Signataire récepteur",
};

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function database() {
  const db = await getDb();
  if (!db) throw new Error("La base de données n’est pas disponible.");
  return db;
}

export function userDisplayName(user: { displayName?: string | null; name?: string | null; email?: string | null }) {
  return user.displayName?.trim() || user.name?.trim() || user.email?.trim() || "Utilisateur";
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await database();
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function updateUserDisplayName(userId: number, displayName: string) {
  const db = await database();
  await db.update(users).set({ displayName: displayName.trim() || null, updatedAt: new Date() }).where(eq(users.id, userId));
  return (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
}

async function ensurePersonalWorkspace(userId: number) {
  const db = await database();
  const existing = await db.select().from(workspaces).where(eq(workspaces.createdByUserId, userId)).limit(1);
  if (existing[0]) return existing[0];
  const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  const created = await db.insert(workspaces).values({ name: `Espace de ${userDisplayName(user ?? {})}`.slice(0, 120), createdByUserId: userId });
  const workspaceId = Number(created[0].insertId);
  await db.insert(workspaceMembers).values({ workspaceId, userId, workspaceRole: "admin" });
  return (await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1))[0];
}

async function acceptPendingInvitations(userId: number, email?: string | null) {
  if (!email) return;
  const db = await database();
  const pending = await db.select().from(workspaceInvitations).where(and(eq(workspaceInvitations.email, email.toLowerCase()), isNull(workspaceInvitations.acceptedAt), isNull(workspaceInvitations.revokedAt)));
  for (const invitation of pending) {
    await db.insert(workspaceMembers).values({ workspaceId: invitation.workspaceId, userId, workspaceRole: invitation.workspaceRole }).onDuplicateKeyUpdate({ set: { workspaceRole: invitation.workspaceRole } });
    await db.update(workspaceInvitations).set({ acceptedAt: new Date() }).where(eq(workspaceInvitations.id, invitation.id));
  }
}

export async function listUserWorkspaces(userId: number) {
  const db = await database();
  const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  await ensurePersonalWorkspace(userId);
  await acceptPendingInvitations(userId, user?.email);
  return db.select({ id: workspaces.id, name: workspaces.name, role: workspaceMembers.workspaceRole, createdByUserId: workspaces.createdByUserId, createdAt: workspaces.createdAt })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(desc(workspaces.updatedAt));
}

export async function getWorkspaceMembership(workspaceId: number, userId: number) {
  const db = await database();
  return (await db.select({ workspace: workspaces, membership: workspaceMembers })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1))[0];
}

export async function createWorkspace(userId: number, name: string) {
  const db = await database();
  const result = await db.insert(workspaces).values({ name: name.trim(), createdByUserId: userId });
  const id = Number(result[0].insertId);
  await db.insert(workspaceMembers).values({ workspaceId: id, userId, workspaceRole: "admin" });
  return (await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1))[0];
}

export async function listWorkspaceMembers(workspaceId: number) {
  const db = await database();
  return db.select({ id: users.id, name: users.name, displayName: users.displayName, email: users.email, workspaceRole: workspaceMembers.workspaceRole, joinedAt: workspaceMembers.createdAt })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));
}

export async function listWorkspaceInvitations(workspaceId: number) {
  const db = await database();
  return db.select().from(workspaceInvitations).where(and(eq(workspaceInvitations.workspaceId, workspaceId), isNull(workspaceInvitations.revokedAt))).orderBy(desc(workspaceInvitations.createdAt));
}

export async function createWorkspaceInvitation(workspaceId: number, email: string, actorUserId: number, workspaceRole: WorkspaceRole) {
  const db = await database();
  const normalizedEmail = email.trim().toLowerCase();
  await db.insert(workspaceInvitations).values({ workspaceId, email: normalizedEmail, invitedByUserId: actorUserId, workspaceRole }).onDuplicateKeyUpdate({ set: { workspaceRole, invitedByUserId: actorUserId, revokedAt: null, acceptedAt: null } });
  const existingUser = (await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1))[0];
  if (existingUser) await acceptPendingInvitations(existingUser.id, normalizedEmail);
  return (await db.select().from(workspaceInvitations).where(and(eq(workspaceInvitations.workspaceId, workspaceId), eq(workspaceInvitations.email, normalizedEmail))).limit(1))[0];
}

export async function removeWorkspaceMember(workspaceId: number, memberUserId: number) {
  const db = await database();
  const workspace = (await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1))[0];
  if (!workspace || workspace.createdByUserId === memberUserId) return false;
  const result = await db.delete(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, memberUserId)));
  return result[0].affectedRows > 0;
}

export async function getIntakeFormForMember(id: number, userId: number) {
  const db = await database();
  return (await db.select({ form: intakeForms, member: workspaceMembers })
    .from(intakeForms)
    .innerJoin(workspaceMembers, and(eq(workspaceMembers.workspaceId, intakeForms.workspaceId), eq(workspaceMembers.userId, userId)))
    .where(eq(intakeForms.id, id))
    .limit(1))[0];
}

export async function listWorkspaceIntakeForms(workspaceId: number, userId: number, lifecycleState: LifecycleState, search?: string) {
  const membership = await getWorkspaceMembership(workspaceId, userId);
  if (!membership) return [];
  const db = await database();
  const term = search?.trim();
  const searchFilter = term ? or(like(intakeForms.projectName, `%${term}%`), like(intakeForms.projectLocation, `%${term}%`)) : undefined;
  return db.select().from(intakeForms)
    .where(searchFilter ? and(eq(intakeForms.workspaceId, workspaceId), eq(intakeForms.lifecycleState, lifecycleState), searchFilter) : and(eq(intakeForms.workspaceId, workspaceId), eq(intakeForms.lifecycleState, lifecycleState)))
    .orderBy(desc(intakeForms.updatedAt));
}

async function recordHistory(formId: number, action: AuditAction, actor: Actor, fields: AuditField[]) {
  const db = await database();
  await db.insert(intakeFormHistory).values({ intakeFormId: formId, action, actorUserId: actor.userId, actorDisplayName: actor.displayName, diffJson: JSON.stringify({ fields }) });
}

function toIntakeInsert(workspaceId: number, ownerId: number, input: IntakeFormInput, offlineClientId?: string): InsertIntakeForm {
  return { workspaceId, ownerId, offlineClientId, ...input };
}

export async function createWorkspaceIntakeForm(workspaceId: number, ownerId: number, input: IntakeFormInput, actor: Actor, offlineClientId?: string) {
  const db = await database();
  const result = await db.insert(intakeForms).values(toIntakeInsert(workspaceId, ownerId, input, offlineClientId));
  const id = Number(result[0].insertId);
  await recordHistory(id, "created", actor, [{ field: "form", label: "Fiche", before: null, after: "Créée" }]);
  return (await db.select().from(intakeForms).where(eq(intakeForms.id, id)).limit(1))[0];
}

export async function createOrGetOfflineWorkspaceIntakeForm(workspaceId: number, ownerId: number, input: IntakeFormInput, actor: Actor, offlineClientId: string) {
  const membership = await getWorkspaceMembership(workspaceId, ownerId);
  if (!membership) return undefined;
  const db = await database();
  const existing = (await db.select().from(intakeForms).where(eq(intakeForms.offlineClientId, offlineClientId)).limit(1))[0];
  if (existing) return existing.workspaceId === workspaceId && existing.ownerId === ownerId ? existing : undefined;
  return createWorkspaceIntakeForm(workspaceId, ownerId, input, actor, offlineClientId);
}

function buildFormDiff(previous: Record<string, unknown>, next: IntakeFormInput): AuditField[] {
  return (Object.keys(formFieldLabels) as Array<keyof IntakeFormInput>)
    .filter(key => previous[key] !== next[key])
    .map(key => ({ field: key, label: formFieldLabels[key], before: previous[key], after: next[key] }));
}

export async function updateWorkspaceIntakeForm(id: number, userId: number, input: IntakeFormInput, actor: Actor) {
  const existing = await getIntakeFormForMember(id, userId);
  if (!existing || existing.form.lifecycleState !== "active") return undefined;
  const diff = buildFormDiff(existing.form as unknown as Record<string, unknown>, input);
  const db = await database();
  await db.update(intakeForms).set({ ...input, updatedAt: new Date() }).where(eq(intakeForms.id, id));
  if (diff.length > 0) await recordHistory(id, "updated", actor, diff);
  return (await db.select().from(intakeForms).where(eq(intakeForms.id, id)).limit(1))[0];
}

export async function changeFormLifecycle(id: number, userId: number, nextState: LifecycleState, actor: Actor) {
  const existing = await getIntakeFormForMember(id, userId);
  if (!existing || existing.form.lifecycleState === nextState) return undefined;
  const allowed: Record<LifecycleState, LifecycleState[]> = { active: ["archived", "trashed"], archived: ["active", "trashed"], trashed: ["active"] };
  if (!allowed[existing.form.lifecycleState].includes(nextState)) return undefined;
  const db = await database();
  const action: AuditAction = nextState === "archived" ? "archived" : nextState === "trashed" ? "trashed" : "restored";
  await db.update(intakeForms).set({ lifecycleState: nextState, trashedAt: nextState === "trashed" ? new Date() : null, updatedAt: new Date() }).where(eq(intakeForms.id, id));
  await recordHistory(id, action, actor, [{ field: "lifecycleState", label: "Emplacement", before: existing.form.lifecycleState, after: nextState }]);
  return (await db.select().from(intakeForms).where(eq(intakeForms.id, id)).limit(1))[0];
}

export async function transferWorkspaceIntakeForm(id: number, sourceUserId: number, targetWorkspaceId: number, actor: Actor) {
  const existing = await getIntakeFormForMember(id, sourceUserId);
  if (!existing || existing.form.lifecycleState === "trashed") return undefined;
  const targetMembership = await getWorkspaceMembership(targetWorkspaceId, sourceUserId);
  if (!targetMembership) return undefined;
  if (existing.member.workspaceRole !== "admin" && existing.form.ownerId !== sourceUserId) return undefined;
  const sourceWorkspace = (await database()).select().from(workspaces).where(eq(workspaces.id, existing.form.workspaceId)).limit(1);
  const source = (await sourceWorkspace)[0];
  const db = await database();
  await db.update(intakeForms).set({ workspaceId: targetWorkspaceId, updatedAt: new Date() }).where(eq(intakeForms.id, id));
  await recordHistory(id, "transferred", actor, [{ field: "workspaceId", label: "Espace", before: source?.name ?? existing.form.workspaceId, after: targetMembership.workspace.name }]);
  return (await db.select().from(intakeForms).where(eq(intakeForms.id, id)).limit(1))[0];
}

export async function listIntakeFormHistory(id: number, userId: number) {
  const access = await getIntakeFormForMember(id, userId);
  if (!access) return undefined;
  const db = await database();
  return db.select().from(intakeFormHistory).where(eq(intakeFormHistory.intakeFormId, id)).orderBy(desc(intakeFormHistory.createdAt));
}

export async function purgeExpiredTrash(taskUid: string) {
  const db = await database();
  const schedule = (await db.select().from(retentionSchedules).where(eq(retentionSchedules.taskUid, taskUid)).limit(1))[0];
  if (!schedule) return { skipped: "orphan", deleted: 0 } as const;
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await db.delete(intakeForms).where(and(eq(intakeForms.lifecycleState, "trashed"), lt(intakeForms.trashedAt, cutoff)));
  return { skipped: null, deleted: result[0].affectedRows } as const;
}

function createShareToken() { return randomBytes(24).toString("base64url"); }

export async function getOwnerShareLink(intakeFormId: number, userId: number) {
  const active = await getIntakeFormForMember(intakeFormId, userId);
  if (!active || active.form.lifecycleState !== "active") return undefined;
  const db = await database();
  return (await db.select().from(intakeFormShares).where(eq(intakeFormShares.intakeFormId, intakeFormId)).limit(1))[0];
}

export async function saveOwnerShareLink(intakeFormId: number, userId: number, permission: SharePermission) {
  const active = await getIntakeFormForMember(intakeFormId, userId);
  if (!active || active.form.lifecycleState !== "active") return undefined;
  const db = await database();
  const existing = (await db.select().from(intakeFormShares).where(eq(intakeFormShares.intakeFormId, intakeFormId)).limit(1))[0];
  if (!existing) await db.insert(intakeFormShares).values({ intakeFormId, token: createShareToken(), permission, isActive: true });
  else if (!existing.isActive) await db.update(intakeFormShares).set({ token: createShareToken(), permission, isActive: true, updatedAt: new Date() }).where(eq(intakeFormShares.id, existing.id));
  else await db.update(intakeFormShares).set({ permission, updatedAt: new Date() }).where(eq(intakeFormShares.id, existing.id));
  return getOwnerShareLink(intakeFormId, userId);
}

export async function revokeOwnerShareLink(intakeFormId: number, userId: number) {
  const active = await getIntakeFormForMember(intakeFormId, userId);
  if (!active) return false;
  const db = await database();
  const result = await db.update(intakeFormShares).set({ isActive: false, updatedAt: new Date() }).where(and(eq(intakeFormShares.intakeFormId, intakeFormId), eq(intakeFormShares.isActive, true)));
  return result[0].affectedRows > 0;
}

export async function getActiveSharedIntakeForm(token: string) {
  const db = await database();
  const result = await db.select({ form: intakeForms, permission: intakeFormShares.permission }).from(intakeFormShares)
    .innerJoin(intakeForms, eq(intakeFormShares.intakeFormId, intakeForms.id))
    .where(and(eq(intakeFormShares.token, token), eq(intakeFormShares.isActive, true), eq(intakeForms.lifecycleState, "active"))).limit(1);
  if (!result[0]) return undefined;
  const { ownerId: _ownerId, workspaceId: _workspaceId, lifecycleState: _lifecycleState, trashedAt: _trashedAt, ...form } = result[0].form;
  return { form, permission: result[0].permission };
}

export async function updateSharedIntakeForm(token: string, input: IntakeFormInput) {
  const shared = await getActiveSharedIntakeForm(token);
  if (!shared) return { status: "missing" as const };
  if (shared.permission !== "edit") return { status: "forbidden" as const };
  const db = await database();
  const existing = (await db.select().from(intakeForms).where(eq(intakeForms.id, shared.form.id)).limit(1))[0];
  if (!existing) return { status: "missing" as const };
  const diff = buildFormDiff(existing as unknown as Record<string, unknown>, input);
  await db.update(intakeForms).set({ ...input, updatedAt: new Date() }).where(eq(intakeForms.id, shared.form.id));
  if (diff.length > 0) await recordHistory(shared.form.id, "updated", { userId: null, displayName: "Collaborateur par lien" }, diff);
  const updated = await getActiveSharedIntakeForm(token);
  return updated ? { status: "success" as const, form: updated.form } : { status: "missing" as const };
}
