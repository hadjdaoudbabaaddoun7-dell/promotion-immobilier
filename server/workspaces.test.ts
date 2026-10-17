import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listUserWorkspaces: vi.fn(),
  createWorkspace: vi.fn(),
  getWorkspaceMembership: vi.fn(),
  listWorkspaceMembers: vi.fn(),
  listWorkspaceInvitations: vi.fn(),
  createWorkspaceInvitation: vi.fn(),
  removeWorkspaceMember: vi.fn(),
  updateUserDisplayName: vi.fn(),
}));

vi.mock("./db", () => mocks);
import { appRouter } from "./routers";

const user = { id: 7, openId: "workspace-admin", name: "Nadia", displayName: null, email: "nadia@example.test", loginMethod: "manus", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

describe("workspace collaboration contract", () => {
  it("updates the user display name used across collaboration surfaces", async () => {
    mocks.updateUserDisplayName.mockResolvedValue({ ...user, displayName: "Nadia Benali" });
    const caller = appRouter.createCaller({ user } as never);
    await expect(caller.profile.updateDisplayName({ displayName: "Nadia Benali" })).resolves.toMatchObject({ displayName: "Nadia Benali" });
    expect(mocks.updateUserDisplayName).toHaveBeenCalledWith(7, "Nadia Benali");
  });

  it("creates a workspace and lists spaces for the authenticated member", async () => {
    mocks.createWorkspace.mockResolvedValue({ id: 9, name: "Direction commerciale" });
    mocks.listUserWorkspaces.mockResolvedValue([{ id: 5, name: "Espace personnel", role: "admin" }]);
    const caller = appRouter.createCaller({ user } as never);
    await expect(caller.workspaces.create({ name: "Direction commerciale" })).resolves.toMatchObject({ id: 9 });
    await expect(caller.workspaces.list()).resolves.toHaveLength(1);
    expect(mocks.createWorkspace).toHaveBeenCalledWith(7, "Direction commerciale");
  });

  it("allows Administrators to invite members by email", async () => {
    mocks.getWorkspaceMembership.mockResolvedValue({ membership: { workspaceRole: "admin" } });
    mocks.createWorkspaceInvitation.mockResolvedValue({ id: 3, email: "team@example.test", workspaceRole: "member" });
    const caller = appRouter.createCaller({ user } as never);
    await expect(caller.workspaces.invite({ workspaceId: 5, email: "team@example.test", role: "member" })).resolves.toMatchObject({ id: 3 });
    expect(mocks.createWorkspaceInvitation).toHaveBeenCalledWith(5, "team@example.test", 7, "member");
  });

  it("blocks a standard Member from inviting collaborators", async () => {
    mocks.getWorkspaceMembership.mockResolvedValue({ membership: { workspaceRole: "member" } });
    const caller = appRouter.createCaller({ user } as never);
    await expect(caller.workspaces.invite({ workspaceId: 5, email: "team@example.test", role: "member" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
