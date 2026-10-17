import type { Request, Response } from "express";
import { offlineSyncOperationSchema } from "../shared/offline";
import * as db from "./db";
import { sdk } from "./_core/sdk";

export async function offlineSyncHandler(req: Request, res: Response) {
  const user = await sdk.authenticateRequest(req).catch(() => null);
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const parsed = offlineSyncOperationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid offline operation" });

  const operation = parsed.data;
  const actor = { userId: user.id, displayName: db.userDisplayName(user) };

  try {
    if (operation.kind === "create") {
      const form = await db.createOrGetOfflineWorkspaceIntakeForm(
        operation.workspaceId,
        user.id,
        operation.data,
        actor,
        operation.clientRecordId,
      );
      if (!form) return res.status(403).json({ error: "Workspace access denied" });
      return res.json({ formId: form.id, operationId: operation.operationId });
    }

    const form = await db.updateWorkspaceIntakeForm(operation.formId, user.id, operation.data, actor);
    if (!form) return res.status(403).json({ error: "Form access denied" });
    return res.json({ formId: form.id, operationId: operation.operationId });
  } catch (error) {
    console.error("[Offline sync] Operation failed", error);
    return res.status(500).json({ error: "Offline synchronization failed" });
  }
}
