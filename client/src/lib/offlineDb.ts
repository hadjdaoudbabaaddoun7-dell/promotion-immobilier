import Dexie, { type Table } from "dexie";
import type { IntakeFormInput } from "@shared/intake";
import type { OfflineSyncOperation } from "@shared/offline";

export type LocalLifecycleState = "active" | "archived" | "trashed";
export type LocalSyncState = "synced" | "pending" | "error";

export type LocalFormRecord = {
  localId: string;
  id: number;
  serverId?: number;
  clientRecordId: string;
  workspaceId: number;
  lifecycleState: LocalLifecycleState;
  data: IntakeFormInput;
  syncState: LocalSyncState;
  updatedAt: number;
  createdAt: number;
};

export type OfflineQueueRecord = OfflineSyncOperation & {
  id: string;
  targetLocalId: string;
  queuedAt: number;
  attempts: number;
  lastError?: string;
};

export type CachedWorkspace = { id: number; name: string; role: "admin" | "member"; createdByUserId: number; createdAt: Date | string };

class DossierImmoOfflineDb extends Dexie {
  forms!: Table<LocalFormRecord, string>;
  operations!: Table<OfflineQueueRecord, string>;
  workspaces!: Table<CachedWorkspace, number>;

  constructor() {
    super("dossier-immo-offline");
    this.version(1).stores({
      forms: "localId, id, serverId, workspaceId, lifecycleState, syncState, updatedAt, [workspaceId+lifecycleState]",
      operations: "id, queuedAt, targetLocalId",
      workspaces: "id",
    });
  }
}

export const offlineDb = new DossierImmoOfflineDb();

function formInputFromServer(form: Record<string, unknown>): IntakeFormInput {
  const keys: Array<keyof IntakeFormInput> = ["projectName", "projectLocation", "submissionDate", "basements", "mezzanines", "commercialGroundFloor", "residentialGroundFloor", "serviceMezzanine", "serviceFloors", "landscapedTerrace", "ces", "cos", "housingF2", "housingF3", "housingF4", "housingF5", "housingDuplex", "housingOther", "standing", "parking", "elevator", "playground", "security", "smartHome", "otherEquipment", "specialInstructions", "cadastralPlan", "urbanPlanningCertificate", "titleDeed", "landRegistryBook", "otherDocument", "transmissionDate", "senderSignature", "receptionDate", "recipientSignature"];
  return Object.fromEntries(keys.map(key => [key, form[key]])) as IntakeFormInput;
}

export async function cacheServerForms(forms: Array<Record<string, unknown>>) {
  const now = Date.now();
  for (const form of forms) {
    const serverId = Number(form.id);
    if (!Number.isInteger(serverId) || serverId < 1) continue;
    const existing = await offlineDb.forms.where("serverId").equals(serverId).first();
    if (existing?.syncState === "pending") continue;
    await offlineDb.forms.put({
      localId: existing?.localId ?? `server:${serverId}`,
      id: serverId,
      serverId,
      clientRecordId: existing?.clientRecordId ?? crypto.randomUUID(),
      workspaceId: Number(form.workspaceId),
      lifecycleState: (form.lifecycleState as LocalLifecycleState) ?? "active",
      data: formInputFromServer(form),
      syncState: "synced",
      updatedAt: new Date(form.updatedAt as string | number | Date).getTime() || now,
      createdAt: new Date(form.createdAt as string | number | Date).getTime() || now,
    });
  }
}

export async function listCachedForms(workspaceId: number, lifecycleState: LocalLifecycleState) {
  return offlineDb.forms.where("[workspaceId+lifecycleState]").equals([workspaceId, lifecycleState] as never).reverse().sortBy("updatedAt");
}

export async function getCachedFormByDisplayId(id: number) {
  return offlineDb.forms.where("id").equals(id).first();
}

export function toDisplayForm(record: LocalFormRecord) {
  return {
    ...record.data,
    id: record.id,
    workspaceId: record.workspaceId,
    lifecycleState: record.lifecycleState,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
    offlineSyncState: record.syncState,
  };
}
