import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { defaultIntakeFormValues } from "@shared/intake";
import { cacheServerForms, getCachedFormByDisplayId, listCachedForms, offlineDb } from "./offlineDb";

afterEach(async () => {
  await offlineDb.forms.clear();
  await offlineDb.operations.clear();
  await offlineDb.workspaces.clear();
});

describe("offline form storage", () => {
  it("caches synchronized server forms for offline workspace access", async () => {
    await cacheServerForms([{ id: 42, workspaceId: 5, lifecycleState: "active", ...defaultIntakeFormValues, projectName: "Résidence Atlas", projectLocation: "Alger", createdAt: new Date(), updatedAt: new Date() }]);
    const cached = await listCachedForms(5, "active");
    expect(cached).toHaveLength(1);
    expect(cached[0]).toMatchObject({ id: 42, serverId: 42, syncState: "synced", workspaceId: 5 });
  });

  it("keeps queued operations in their original chronological order", async () => {
    await offlineDb.operations.bulkAdd([
      { id: "op-create", kind: "create", operationId: "operation-create-123", clientRecordId: "client-record-123", workspaceId: 5, data: defaultIntakeFormValues, targetLocalId: "local-form", queuedAt: 100, attempts: 0 },
      { id: "op-update", kind: "update", operationId: "operation-update-123", clientRecordId: "client-record-123", formId: 42, data: { ...defaultIntakeFormValues, projectName: "Atlas mise à jour" }, targetLocalId: "local-form", queuedAt: 200, attempts: 0 },
    ]);
    const operations = await offlineDb.operations.orderBy("queuedAt").toArray();
    expect(operations.map(operation => operation.id)).toEqual(["op-create", "op-update"]);
  });

  it("keeps a newly created fiche available locally until ordered replay reconciles its server identifier", async () => {
    await offlineDb.forms.add({ localId: "local-new", id: 1_750_000_000_000, clientRecordId: "client-record-new", workspaceId: 5, lifecycleState: "active", data: { ...defaultIntakeFormValues, projectName: "Fiche locale", projectLocation: "Oran" }, syncState: "pending", createdAt: 100, updatedAt: 100 });
    await offlineDb.operations.add({ id: "op-local-create", kind: "create", operationId: "operation-local-create", clientRecordId: "client-record-new", workspaceId: 5, data: { ...defaultIntakeFormValues, projectName: "Fiche locale", projectLocation: "Oran" }, targetLocalId: "local-new", queuedAt: 100, attempts: 0 });

    expect(await listCachedForms(5, "active")).toHaveLength(1);
    await offlineDb.forms.update("local-new", { id: 73, serverId: 73, syncState: "synced", updatedAt: 200 });
    await offlineDb.operations.delete("op-local-create");

    expect(await offlineDb.operations.count()).toBe(0);
    expect(await getCachedFormByDisplayId(73)).toMatchObject({ serverId: 73, syncState: "synced" });
  });
});
