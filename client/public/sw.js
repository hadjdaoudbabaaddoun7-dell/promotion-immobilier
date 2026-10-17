const CACHE_NAME = "dossier-immo-shell-v1";
const DB_NAME = "dossier-immo-offline";
const STORE_FORMS = "forms";
const STORE_OPERATIONS = "operations";

const openDb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const transaction = async (storeName, mode, task) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    task(store, value => { result = value; });
  });
};

const listOperations = () => transaction(STORE_OPERATIONS, "readonly", (store, set) => {
  const request = store.getAll();
  request.onsuccess = () => set(request.result.sort((a, b) => a.queuedAt - b.queuedAt));
});
const getForm = localId => transaction(STORE_FORMS, "readonly", (store, set) => { const request = store.get(localId); request.onsuccess = () => set(request.result); });
const updateForm = value => transaction(STORE_FORMS, "readwrite", store => store.put(value));
const deleteOperation = id => transaction(STORE_OPERATIONS, "readwrite", store => store.delete(id));

async function flushOfflineQueue() {
  const operations = await listOperations();
  for (const operation of operations) {
    const form = await getForm(operation.targetLocalId);
    if (!form) { await deleteOperation(operation.id); continue; }
    const payload = operation.kind === "create"
      ? { kind: "create", operationId: operation.operationId, clientRecordId: operation.clientRecordId, workspaceId: operation.workspaceId, data: operation.data }
      : form.serverId ? { kind: "update", operationId: operation.operationId, clientRecordId: operation.clientRecordId, formId: form.serverId, data: operation.data } : null;
    if (!payload) break;
    const response = await fetch("/api/offline-sync", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) break;
    const result = await response.json();
    await updateForm({ ...form, serverId: result.formId, id: result.formId, syncState: "synced", updatedAt: Date.now() });
    await deleteOperation(operation.id);
  }
  const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clientsList.forEach(client => client.postMessage({ type: "offline-sync-complete" }));
}

self.addEventListener("install", event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(["/", "/manifest.webmanifest"]))));
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("sync", event => { if (event.tag === "dossier-immo-sync") event.waitUntil(flushOfflineQueue()); });
self.addEventListener("message", event => { if (event.data?.type === "sync-offline-queue") event.waitUntil(flushOfflineQueue()); });
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.url.includes("/api/")) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(response => { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put("/", copy)); return response; }).catch(() => caches.match("/")));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone())); return response; })));
});
