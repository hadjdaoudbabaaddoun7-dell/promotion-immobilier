import { describe, expect, it, vi } from "vitest";
import { defaultIntakeFormValues } from "../shared/intake";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  userDisplayName: vi.fn(() => "Nadia Hors ligne"),
  createOrGetOfflineWorkspaceIntakeForm: vi.fn(),
  updateWorkspaceIntakeForm: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./db", () => mocks);

import { offlineSyncHandler } from "./offlineSync";

function responseRecorder() {
  const body: { value?: unknown } = {};
  const res = {
    status: vi.fn(() => res),
    json: vi.fn((value: unknown) => { body.value = value; return res; }),
  };
  return { res, body };
}

const user = { id: 7, name: "Nadia", displayName: "Nadia Hors ligne", email: "nadia@example.test" };
const data = { ...defaultIntakeFormValues, projectName: "Résidence Atlas", projectLocation: "Alger" };

describe("offline sync endpoint", () => {
  it("replays a local create with the authenticated actor and stable client record identifier", async () => {
    mocks.authenticateRequest.mockResolvedValue(user);
    mocks.createOrGetOfflineWorkspaceIntakeForm.mockResolvedValue({ id: 42 });
    const { res, body } = responseRecorder();
    await offlineSyncHandler({ body: { kind: "create", operationId: "operation-123456", clientRecordId: "client-record-123456", workspaceId: 5, data } } as never, res as never);
    expect(mocks.createOrGetOfflineWorkspaceIntakeForm).toHaveBeenCalledWith(5, 7, data, { userId: 7, displayName: "Nadia Hors ligne" }, "client-record-123456");
    expect(body.value).toEqual({ formId: 42, operationId: "operation-123456" });
  });

  it("replays queued updates only through the existing workspace-aware update contract", async () => {
    mocks.authenticateRequest.mockResolvedValue(user);
    mocks.updateWorkspaceIntakeForm.mockResolvedValue({ id: 42 });
    const { res, body } = responseRecorder();
    await offlineSyncHandler({ body: { kind: "update", operationId: "operation-654321", clientRecordId: "client-record-123456", formId: 42, data } } as never, res as never);
    expect(mocks.updateWorkspaceIntakeForm).toHaveBeenCalledWith(42, 7, data, { userId: 7, displayName: "Nadia Hors ligne" });
    expect(body.value).toEqual({ formId: 42, operationId: "operation-654321" });
  });

  it("rejects unauthenticated or malformed replay attempts", async () => {
    mocks.authenticateRequest.mockResolvedValueOnce(null);
    const first = responseRecorder();
    await offlineSyncHandler({ body: {} } as never, first.res as never);
    expect(first.res.status).toHaveBeenCalledWith(401);

    mocks.authenticateRequest.mockResolvedValueOnce(user);
    const second = responseRecorder();
    await offlineSyncHandler({ body: { kind: "create" } } as never, second.res as never);
    expect(second.res.status).toHaveBeenCalledWith(400);
  });
});
