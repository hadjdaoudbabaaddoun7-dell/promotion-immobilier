import { z } from "zod";
import { sharePermissionValues } from "../../shared/intake";
import * as db from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const formIdInput = z.object({ intakeFormId: z.number().int().positive() });

export const shareLinksRouter = router({
  get: protectedProcedure.input(formIdInput).query(async ({ ctx, input }) => {
    const share = await db.getOwnerShareLink(input.intakeFormId, ctx.user.id);
    return share ?? null;
  }),
  save: protectedProcedure
    .input(formIdInput.extend({ permission: z.enum(sharePermissionValues) }))
    .mutation(async ({ ctx, input }) => {
      const share = await db.saveOwnerShareLink(input.intakeFormId, ctx.user.id, input.permission);
      if (!share) throw new Error("Fiche introuvable.");
      return share;
    }),
  revoke: protectedProcedure.input(formIdInput).mutation(async ({ ctx, input }) => {
    const revoked = await db.revokeOwnerShareLink(input.intakeFormId, ctx.user.id);
    if (!revoked) throw new Error("Aucun lien de partage actif n’a été trouvé.");
    return { success: true } as const;
  }),
});
