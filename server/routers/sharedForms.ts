import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { intakeFormInputSchema } from "../../shared/intake";
import * as db from "../db";
import { publicProcedure, router } from "../_core/trpc";

const tokenInput = z.object({ token: z.string().min(20).max(64) });

export const sharedFormsRouter = router({
  get: publicProcedure.input(tokenInput).query(async ({ input }) => {
    const shared = await db.getActiveSharedIntakeForm(input.token);
    if (!shared) throw new TRPCError({ code: "NOT_FOUND", message: "Ce lien de partage est invalide ou a été révoqué." });
    return shared;
  }),
  update: publicProcedure
    .input(tokenInput.extend({ data: intakeFormInputSchema }))
    .mutation(async ({ input }) => {
      const updated = await db.updateSharedIntakeForm(input.token, input.data);
      if (updated.status === "missing") throw new TRPCError({ code: "NOT_FOUND", message: "Ce lien de partage est invalide ou a été révoqué." });
      if (updated.status === "forbidden") throw new TRPCError({ code: "FORBIDDEN", message: "Ce lien permet uniquement la consultation." });
      return updated.form;
    }),
});
