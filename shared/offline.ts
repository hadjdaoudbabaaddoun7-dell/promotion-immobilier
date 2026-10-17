import { z } from "zod";
import { intakeFormInputSchema } from "./intake";

const operationId = z.string().trim().min(12).max(96);
const clientRecordId = z.string().trim().min(12).max(96);

export const offlineSyncOperationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("create"),
    operationId,
    clientRecordId,
    workspaceId: z.number().int().positive(),
    data: intakeFormInputSchema,
  }),
  z.object({
    kind: z.literal("update"),
    operationId,
    clientRecordId,
    formId: z.number().int().positive(),
    data: intakeFormInputSchema,
  }),
]);

export type OfflineSyncOperation = z.infer<typeof offlineSyncOperationSchema>;
