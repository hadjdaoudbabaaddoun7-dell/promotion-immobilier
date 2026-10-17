import { describe, expect, it, vi } from "vitest";
import { defaultIntakeFormValues } from "../shared/intake";

const mocks = vi.hoisted(() => ({
  getOwnerShareLink: vi.fn(),
  saveOwnerShareLink: vi.fn(),
  revokeOwnerShareLink: vi.fn(),
  getActiveSharedIntakeForm: vi.fn(),
  updateSharedIntakeForm: vi.fn(),
}));

vi.mock("./db", () => mocks);

import { appRouter } from "./routers";

const user = {
  id: 7,
  openId: "project-owner",
  name: "Project Owner",
  email: "owner@example.test",
  loginMethod: "manus",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const publicCaller = () => appRouter.createCaller({ user: null } as never);
const form = { id: 42, ...defaultIntakeFormValues, projectName: "Résidence Atlas", projectLocation: "Alger" };

describe("share-link contract", () => {
  it("returns a defined null state when an owned fiche has no share link", async () => {
    mocks.getOwnerShareLink.mockResolvedValue(undefined);
    const caller = appRouter.createCaller({ user } as never);
    await expect(caller.shareLinks.get({ intakeFormId: 42 })).resolves.toBeNull();
    expect(mocks.getOwnerShareLink).toHaveBeenCalledWith(42, 7);
  });

  it("creates or updates an owner-owned editor link", async () => {
    const share = { token: "safeSharedToken1234567890", permission: "edit" as const, isActive: true, updatedAt: new Date() };
    mocks.saveOwnerShareLink.mockResolvedValue(share);
    const caller = appRouter.createCaller({ user } as never);
    await expect(caller.shareLinks.save({ intakeFormId: 42, permission: "edit" })).resolves.toEqual(share);
    expect(mocks.saveOwnerShareLink).toHaveBeenCalledWith(42, 7, "edit");
  });

  it("revokes a link only through the authenticated owner procedure", async () => {
    mocks.revokeOwnerShareLink.mockResolvedValue(true);
    const caller = appRouter.createCaller({ user } as never);
    await expect(caller.shareLinks.revoke({ intakeFormId: 42 })).resolves.toEqual({ success: true });
    expect(mocks.revokeOwnerShareLink).toHaveBeenCalledWith(42, 7);
  });

  it("allows an anonymous visitor to retrieve a valid view-only link", async () => {
    mocks.getActiveSharedIntakeForm.mockResolvedValue({ form, permission: "view" });
    await expect(publicCaller().sharedForms.get({ token: "safeSharedToken1234567890" })).resolves.toMatchObject({ permission: "view", form: { id: 42 } });
  });

  it("allows an anonymous editor link to update the specific shared form", async () => {
    mocks.updateSharedIntakeForm.mockResolvedValue({ status: "success", form });
    const input = { ...defaultIntakeFormValues, projectName: "Résidence Atlas mise à jour", projectLocation: "Alger" };
    await expect(publicCaller().sharedForms.update({ token: "safeSharedToken1234567890", data: input })).resolves.toMatchObject({ id: 42 });
    expect(mocks.updateSharedIntakeForm).toHaveBeenCalledWith("safeSharedToken1234567890", input);
  });

  it("blocks edits performed with a read-only link", async () => {
    mocks.updateSharedIntakeForm.mockResolvedValue({ status: "forbidden" });
    const input = { ...defaultIntakeFormValues, projectName: "Résidence Atlas", projectLocation: "Alger" };
    await expect(publicCaller().sharedForms.update({ token: "safeSharedToken1234567890", data: input })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies access after a share link has been revoked", async () => {
    mocks.getActiveSharedIntakeForm.mockResolvedValue(undefined);
    await expect(publicCaller().sharedForms.get({ token: "safeSharedToken1234567890" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
