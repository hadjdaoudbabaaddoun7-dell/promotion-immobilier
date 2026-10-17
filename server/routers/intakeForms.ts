import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { intakeFormInputSchema } from "../../shared/intake";
import * as db from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const actorFrom = (user: { id: number; displayName?: string | null; name?: string | null; email?: string | null }) => ({ userId: user.id, displayName: db.userDisplayName(user) });
const formIdInput = z.object({ id: z.number().int().positive() });
const workspaceStates = ["active", "archived", "trashed"] as const;

export const intakeFormsRouter = router({
  list: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), state: z.enum(workspaceStates).default("active"), search: z.string().trim().max(120).optional() })).query(({ ctx, input }) => db.listWorkspaceIntakeForms(input.workspaceId, ctx.user.id, input.state, input.search)),
  get: protectedProcedure.input(formIdInput).query(async ({ ctx, input }) => {
    const record = await db.getIntakeFormForMember(input.id, ctx.user.id);
    if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Fiche introuvable." });
    return { ...record.form, workspaceRole: record.member.workspaceRole };
  }),
  create: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), data: intakeFormInputSchema })).mutation(async ({ ctx, input }) => {
    const membership = await db.getWorkspaceMembership(input.workspaceId, ctx.user.id);
    if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Vous n’êtes pas membre de cet espace." });
    return db.createWorkspaceIntakeForm(input.workspaceId, ctx.user.id, input.data, actorFrom(ctx.user));
  }),
  update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: intakeFormInputSchema })).mutation(async ({ ctx, input }) => {
    const record = await db.updateWorkspaceIntakeForm(input.id, ctx.user.id, input.data, actorFrom(ctx.user));
    if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Fiche introuvable ou non modifiable." });
    return record;
  }),
  archive: protectedProcedure.input(formIdInput).mutation(async ({ ctx, input }) => {
    const record = await db.changeFormLifecycle(input.id, ctx.user.id, "archived", actorFrom(ctx.user));
    if (!record) throw new TRPCError({ code: "BAD_REQUEST", message: "Cette fiche ne peut pas être archivée." });
    return record;
  }),
  restore: protectedProcedure.input(formIdInput).mutation(async ({ ctx, input }) => {
    const record = await db.changeFormLifecycle(input.id, ctx.user.id, "active", actorFrom(ctx.user));
    if (!record) throw new TRPCError({ code: "BAD_REQUEST", message: "Cette fiche ne peut pas être restaurée." });
    return record;
  }),
  trash: protectedProcedure.input(formIdInput).mutation(async ({ ctx, input }) => {
    const record = await db.changeFormLifecycle(input.id, ctx.user.id, "trashed", actorFrom(ctx.user));
    if (!record) throw new TRPCError({ code: "BAD_REQUEST", message: "Cette fiche ne peut pas être placée dans la Corbeille." });
    return record;
  }),
  transfer: protectedProcedure.input(formIdInput.extend({ targetWorkspaceId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const record = await db.transferWorkspaceIntakeForm(input.id, ctx.user.id, input.targetWorkspaceId, actorFrom(ctx.user));
    if (!record) throw new TRPCError({ code: "FORBIDDEN", message: "Transfert non autorisé ou espace de destination inaccessible." });
    return record;
  }),
  history: protectedProcedure.input(formIdInput).query(async ({ ctx, input }) => {
    const history = await db.listIntakeFormHistory(input.id, ctx.user.id);
    if (!history) throw new TRPCError({ code: "NOT_FOUND", message: "Fiche introuvable." });
    return history;
  }),
});
