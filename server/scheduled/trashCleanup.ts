import type { Request, Response } from "express";
import * as db from "../db";
import { sdk } from "../_core/sdk";

export async function trashCleanupHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const result = await db.purgeExpiredTrash(user.taskUid);
    return res.json({ ok: true, ...result, timestamp: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ error: String(error), timestamp: new Date().toISOString() });
  }
}
