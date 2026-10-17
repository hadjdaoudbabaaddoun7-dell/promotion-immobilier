import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const workspaceInput = z.object({ workspaceId: z.number().int().positive() });

async function requireMembership(workspaceId: number, userId: number) {
  const access = await db.getWorkspaceMembership(workspaceId, userId);
  if (!access) throw new TRPCError({ code: "FORBIDDEN", message: "Vous n’êtes pas membre de cet espace." });
  return access;
}

async function requireAdmin(workspaceId: number, userId: number) {
  const access = await requireMembership(workspaceId, userId);
  if (access.membership.workspaceRole !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Cette action est réservée aux Administrateurs de l’espace." });
  return access;
}

export const workspacesRouter = router({
  list: protectedProcedure.query(({ ctx }) => db.listUserWorkspaces(ctx.user.id)),
  create: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(120) })).mutation(({ ctx, input }) => db.createWorkspace(ctx.user.id, input.name)),
  members: protectedProcedure.input(workspaceInput).query(async ({ ctx, input }) => {
    await requireMembership(input.workspaceId, ctx.user.id);
    return db.listWorkspaceMembers(input.workspaceId);
  }),
  invitations: protectedProcedure.input(workspaceInput).query(async ({ ctx, input }) => {
    await requireAdmin(input.workspaceId, ctx.user.id);
    return db.listWorkspaceInvitations(input.workspaceId);
  }),
  invite: protectedProcedure.input(workspaceInput.extend({ email: z.string().trim().email().max(320), role: z.enum(["admin", "member"]).default("member") })).mutation(async ({ ctx, input }) => {
    await requireAdmin(input.workspaceId, ctx.user.id);
    return db.createWorkspaceInvitation(input.workspaceId, input.email, ctx.user.id, input.role);
  }),
  removeMember: protectedProcedure.input(workspaceInput.extend({ userId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await requireAdmin(input.workspaceId, ctx.user.id);
    const removed = await db.removeWorkspaceMember(input.workspaceId, input.userId);
    if (!removed) throw new TRPCError({ code: "BAD_REQUEST", message: "Le créateur de l’espace ne peut pas être retiré." });
    return { success: true } as const;
  }),
});
