import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authenticateRequest: vi.fn(), purgeExpiredTrash: vi.fn() }));
vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./db", () => ({ purgeExpiredTrash: mocks.purgeExpiredTrash }));
import { trashCleanupHandler } from "./scheduled/trashCleanup";

function response() {
  const result = { statusCode: 200, body: null as unknown, status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return this; } };
  return result;
}

describe("daily trash cleanup", () => {
  it("rejects non-cron callers", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false });
    const res = response();
    await trashCleanupHandler({} as never, res as never);
    expect(res.statusCode).toBe(403);
  });

  it("purges only through the verified scheduled task identity", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-daily-cleanup" });
    mocks.purgeExpiredTrash.mockResolvedValue({ skipped: null, deleted: 3 });
    const res = response();
    await trashCleanupHandler({} as never, res as never);
    expect(mocks.purgeExpiredTrash).toHaveBeenCalledWith("task-daily-cleanup");
    expect(res.statusCode).toBe(200);
  });
});
