import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { intakeFormsRouter } from "./routers/intakeForms";
import { profileRouter } from "./routers/profile";
import { shareLinksRouter } from "./routers/shareLinks";
import { sharedFormsRouter } from "./routers/sharedForms";
import { workspacesRouter } from "./routers/workspaces";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  intakeForms: intakeFormsRouter,
  profile: profileRouter,
  shareLinks: shareLinksRouter,
  sharedForms: sharedFormsRouter,
  workspaces: workspacesRouter,
});

export type AppRouter = typeof appRouter;
