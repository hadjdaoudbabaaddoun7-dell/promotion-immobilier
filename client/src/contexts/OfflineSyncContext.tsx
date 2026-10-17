import { offlineDb, type LocalFormRecord, type LocalLifecycleState, type OfflineQueueRecord, toDisplayForm } from "@/lib/offlineDb";
import { trpc } from "@/lib/trpc";
import type { IntakeFormInput } from "@shared/intake";
import type { OfflineSyncOperation } from "@shared/offline";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type OfflineSyncStatus = "online" | "offline" | "syncing" | "pending";
type SaveInput = { mode: "create"; workspaceId: number; data: IntakeFormInput } | { mode: "update"; id: number; data: IntakeFormInput };
type OfflineSyncContextValue = {
  online: boolean;
  status: OfflineSyncStatus;
  pendingCount: number;
  revision: number;
  saveForm: (input: SaveInput) => Promise<{ id: number; offline: boolean }>;
  syncNow: () => Promise<void>;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | undefined>(undefined);

const makeOperationId = () => crypto.randomUUID();

async function requestBackgroundSync() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const sync = (registration as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync;
  await sync?.register("dossier-immo-sync").catch(() => undefined);
}

async function countPending() { return offlineDb.operations.count(); }

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const utils = trpc.useUtils();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [revision, setRevision] = useState(0);
  const syncingRef = useRef(false);
  const refreshLocalState = useCallback(async () => {
    setPendingCount(await countPending());
    setRevision(value => value + 1);
  }, []);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine || syncingRef.current) return;
    const queued = await offlineDb.operations.orderBy("queuedAt").toArray();
    if (!queued.length) { await refreshLocalState(); return; }
    syncingRef.current = true;
    setSyncing(true);
    try {
      for (const operation of queued) {
        const localForm = await offlineDb.forms.get(operation.targetLocalId);
        if (!localForm) { await offlineDb.operations.delete(operation.id); continue; }
        const payload: OfflineSyncOperation = operation.kind === "create"
          ? { kind: "create", operationId: operation.operationId, clientRecordId: operation.clientRecordId, workspaceId: operation.workspaceId, data: operation.data }
          : { kind: "update", operationId: operation.operationId, clientRecordId: operation.clientRecordId, formId: localForm.serverId ?? operation.formId!, data: operation.data };
        if (payload.kind === "update" && !localForm.serverId) break;
        const response = await fetch("/api/offline-sync", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!response.ok) {
          await offlineDb.operations.update(operation.id, { attempts: operation.attempts + 1, lastError: `HTTP ${response.status}` });
          await offlineDb.forms.update(operation.targetLocalId, { syncState: response.status >= 400 && response.status < 500 ? "error" : "pending" });
          break;
        }
        const result = await response.json() as { formId: number };
        await offlineDb.forms.update(operation.targetLocalId, { serverId: result.formId, id: result.formId, syncState: "synced", updatedAt: Date.now() });
        await offlineDb.operations.delete(operation.id);
      }
      await utils.intakeForms.invalidate();
    } catch {
      // Network recovery will trigger another replay.
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      await refreshLocalState();
    }
  }, [refreshLocalState, utils]);

  useEffect(() => {
    void refreshLocalState();
    const handleOnline = () => { setOnline(true); void syncNow(); };
    const handleOffline = () => setOnline(false);
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "offline-sync-complete") return;
      void refreshLocalState();
      void utils.intakeForms.invalidate();
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", handleOnline);
    navigator.serviceWorker?.addEventListener("message", handleServiceWorkerMessage);
    void requestBackgroundSync();
    if (navigator.onLine) void syncNow();
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); window.removeEventListener("focus", handleOnline); navigator.serviceWorker?.removeEventListener("message", handleServiceWorkerMessage); };
  }, [refreshLocalState, syncNow, utils]);

  const saveForm = useCallback(async (input: SaveInput) => {
    const now = Date.now();
    let local: LocalFormRecord;
    let operation: OfflineQueueRecord;
    if (input.mode === "create") {
      const localId = crypto.randomUUID();
      local = { localId, id: now, clientRecordId: crypto.randomUUID(), workspaceId: input.workspaceId, lifecycleState: "active", data: input.data, syncState: "pending", updatedAt: now, createdAt: now };
      operation = { id: makeOperationId(), kind: "create", operationId: makeOperationId(), clientRecordId: local.clientRecordId, workspaceId: input.workspaceId, data: input.data, targetLocalId: localId, queuedAt: now, attempts: 0 };
    } else {
      const existing = await offlineDb.forms.where("id").equals(input.id).first();
      if (!existing) throw new Error("Cette fiche n’est pas disponible hors ligne.");
      local = { ...existing, data: input.data, syncState: "pending", updatedAt: now };
      operation = { id: makeOperationId(), kind: "update", operationId: makeOperationId(), clientRecordId: existing.clientRecordId, formId: existing.serverId ?? 1, data: input.data, targetLocalId: existing.localId, queuedAt: now, attempts: 0 };
    }
    await offlineDb.transaction("rw", offlineDb.forms, offlineDb.operations, async () => { await offlineDb.forms.put(local); await offlineDb.operations.add(operation); });
    await refreshLocalState();
    await requestBackgroundSync();
    if (navigator.onLine) {
      await syncNow();
      const synchronized = await offlineDb.forms.get(local.localId);
      return { id: synchronized?.id ?? local.id, offline: Boolean(synchronized?.syncState !== "synced") };
    }
    return { id: local.id, offline: true };
  }, [refreshLocalState, syncNow]);

  const status: OfflineSyncStatus = syncing ? "syncing" : !online ? "offline" : pendingCount > 0 ? "pending" : "online";
  const value = useMemo(() => ({ online, status, pendingCount, revision, saveForm, syncNow }), [online, pendingCount, revision, saveForm, status, syncNow]);
  return <OfflineSyncContext.Provider value={value}>{children}</OfflineSyncContext.Provider>;
}

export function useOfflineSync() {
  const context = useContext(OfflineSyncContext);
  if (!context) throw new Error("useOfflineSync must be used inside OfflineSyncProvider");
  return context;
}
