import { describe, expect, it, vi } from "vitest";
import { defaultIntakeFormValues, intakeFormInputSchema } from "../shared/intake";

const mocks = vi.hoisted(() => ({
  userDisplayName: vi.fn(() => "Nadia Test"),
  listWorkspaceIntakeForms: vi.fn(),
  getIntakeFormForMember: vi.fn(),
  getWorkspaceMembership: vi.fn(),
  createWorkspaceIntakeForm: vi.fn(),
  updateWorkspaceIntakeForm: vi.fn(),
  changeFormLifecycle: vi.fn(),
  transferWorkspaceIntakeForm: vi.fn(),
  listIntakeFormHistory: vi.fn(),
}));

vi.mock("./db", () => mocks);
import { appRouter } from "./routers";

const user = { id: 7, openId: "workspace-member", name: "Nadia Test", displayName: "Nadia Test", email: "nadia@example.test", loginMethod: "manus", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const activeForm = { id: 42, workspaceId: 5, ownerId: 7, lifecycleState: "active" as const, trashedAt: null, ...defaultIntakeFormValues, projectName: "Résidence Atlas", projectLocation: "Alger", createdAt: new Date(), updatedAt: new Date() };
const access = { form: activeForm, member: { workspaceRole: "member" as const } };

describe("workspace intake form contract", () => {
  it("validates required project fields and exclusive standing", () => {
    expect(intakeFormInputSchema.safeParse({ ...defaultIntakeFormValues, projectName: "Résidence Atlas", projectLocation: "Alger", standing: "Haut" }).success).toBe(true);
    expect(intakeFormInputSchema.safeParse({ ...defaultIntakeFormValues, projectName: "", projectLocation: "Alger" }).success).toBe(false);
    expect(intakeFormInputSchema.safeParse({ ...defaultIntakeFormValues, projectName: "Atlas", projectLocation: "Alger", standing: "Premium" }).success).toBe(false);
  });

  it("lists only the selected workspace lifecycle bucket", async () => {
    mocks.listWorkspaceIntakeForms.mockResolvedValue([]);
    const caller = appRouter.createCaller({ user } as never);
    await expect(caller.intakeForms.list({ workspaceId: 5, state: "archived", search: "Atlas" })).resolves.toEqual([]);
    expect(mocks.listWorkspaceIntakeForms).toHaveBeenCalledWith(5, 7, "archived", "Atlas");
  });

  it("creates a form only for a workspace membership", async () => {
    mocks.getWorkspaceMembership.mockResolvedValue({ membership: { workspaceRole: "member" } });
    mocks.createWorkspaceIntakeForm.mockResolvedValue(activeForm);
    const caller = appRouter.createCaller({ user } as never);
    const data = { ...defaultIntakeFormValues, projectName: "Résidence Atlas", projectLocation: "Alger" };
    await expect(caller.intakeForms.create({ workspaceId: 5, data })).resolves.toMatchObject({ id: 42 });
    expect(mocks.createWorkspaceIntakeForm).toHaveBeenCalledWith(5, 7, data, { userId: 7, displayName: "Nadia Test" });
  });

  it("retrieves a fiche through workspace membership", async () => {
    mocks.getIntakeFormForMember.mockResolvedValue(access);
    const caller = appRouter.createCaller({ user } as never);
    await expect(caller.intakeForms.get({ id: 42 })).resolves.toMatchObject({ id: 42, workspaceRole: "member" });
  });

  it("archives, restores, and moves forms to Trash instead of deleting them", async () => {
    mocks.changeFormLifecycle.mockResolvedValue(activeForm);
    const caller = appRouter.createCaller({ user } as never);
    await caller.intakeForms.archive({ id: 42 });
    await caller.intakeForms.restore({ id: 42 });
    await caller.intakeForms.trash({ id: 42 });
    expect(mocks.changeFormLifecycle).toHaveBeenNthCalledWith(1, 42, 7, "archived", { userId: 7, displayName: "Nadia Test" });
    expect(mocks.changeFormLifecycle).toHaveBeenNthCalledWith(2, 42, 7, "active", { userId: 7, displayName: "Nadia Test" });
    expect(mocks.changeFormLifecycle).toHaveBeenNthCalledWith(3, 42, 7, "trashed", { userId: 7, displayName: "Nadia Test" });
  });

  it("transfers a fiche only through the workspace transfer contract", async () => {
    mocks.transferWorkspaceIntakeForm.mockResolvedValue({ ...activeForm, workspaceId: 9 });
    const caller = appRouter.createCaller({ user } as never);
    await expect(caller.intakeForms.transfer({ id: 42, targetWorkspaceId: 9 })).resolves.toMatchObject({ workspaceId: 9 });
    expect(mocks.transferWorkspaceIntakeForm).toHaveBeenCalledWith(42, 7, 9, { userId: 7, displayName: "Nadia Test" });
  });

  it("returns field-level history only to workspace members", async () => {
    mocks.listIntakeFormHistory.mockResolvedValue([{ id: 1, action: "updated", actorDisplayName: "Nadia Test", diffJson: '{"fields":[{"label":"Lieu","before":"Alger","after":"Oran"}]}' }]);
    const caller = appRouter.createCaller({ user } as never);
    await expect(caller.intakeForms.history({ id: 42 })).resolves.toHaveLength(1);
    expect(mocks.listIntakeFormHistory).toHaveBeenCalledWith(42, 7);
  });
});
