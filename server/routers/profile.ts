import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const profileRouter = router({
  updateDisplayName: protectedProcedure
    .input(z.object({ displayName: z.string().trim().max(120) }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.updateUserDisplayName(ctx.user.id, input.displayName);
      if (!user) throw new Error("Profil introuvable.");
      return user;
    }),
});
