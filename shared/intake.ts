import { z } from "zod";

export const standingValues = ["Normal", "Moyen", "Haut"] as const;
export const sharePermissionValues = ["view", "edit"] as const;
export type SharePermission = (typeof sharePermissionValues)[number];

const integerValue = z.string().trim().regex(/^\d*$/, "Saisissez un nombre entier.").max(6);
const decimalValue = z.string().trim().regex(/^\d*(?:[,.]\d+)?$/, "Saisissez une valeur numérique.").max(12);

export const intakeFormInputSchema = z.object({
  projectName: z.string().trim().min(1, "Le Nom du dossier est requis.").max(180),
  projectLocation: z.string().trim().min(1, "Le Lieu est requis.").max(180),
  submissionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La Date de dépôt est requise."),
  basements: integerValue,
  mezzanines: integerValue,
  commercialGroundFloor: z.boolean(),
  residentialGroundFloor: z.boolean(),
  serviceMezzanine: z.boolean(),
  serviceFloors: integerValue,
  landscapedTerrace: z.boolean(),
  ces: decimalValue,
  cos: decimalValue,
  housingF2: z.boolean(),
  housingF3: z.boolean(),
  housingF4: z.boolean(),
  housingF5: z.boolean(),
  housingDuplex: z.boolean(),
  housingOther: z.boolean(),
  standing: z.enum(standingValues),
  parking: z.boolean(),
  elevator: z.boolean(),
  playground: z.boolean(),
  security: z.boolean(),
  smartHome: z.boolean(),
  otherEquipment: z.string().trim().max(250),
  specialInstructions: z.string().trim().max(3000),
  cadastralPlan: z.boolean(),
  urbanPlanningCertificate: z.boolean(),
  titleDeed: z.boolean(),
  landRegistryBook: z.boolean(),
  otherDocument: z.boolean(),
  transmissionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La Date de transmission est requise."),
  senderSignature: z.string().trim().max(160),
  receptionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La Date de réception est requise."),
  recipientSignature: z.string().trim().max(160),
});

export type IntakeFormInput = z.infer<typeof intakeFormInputSchema>;

export const defaultIntakeFormValues: IntakeFormInput = {
  projectName: "",
  projectLocation: "",
  submissionDate: new Date().toISOString().slice(0, 10),
  basements: "",
  mezzanines: "",
  commercialGroundFloor: false,
  residentialGroundFloor: false,
  serviceMezzanine: false,
  serviceFloors: "",
  landscapedTerrace: false,
  ces: "",
  cos: "",
  housingF2: false,
  housingF3: false,
  housingF4: false,
  housingF5: false,
  housingDuplex: false,
  housingOther: false,
  standing: "Normal",
  parking: false,
  elevator: false,
  playground: false,
  security: false,
  smartHome: false,
  otherEquipment: "",
  specialInstructions: "",
  cadastralPlan: false,
  urbanPlanningCertificate: false,
  titleDeed: false,
  landRegistryBook: false,
  otherDocument: false,
  transmissionDate: new Date().toISOString().slice(0, 10),
  senderSignature: "",
  receptionDate: new Date().toISOString().slice(0, 10),
  recipientSignature: "",
};

export function formatFrenchDate(value?: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}
