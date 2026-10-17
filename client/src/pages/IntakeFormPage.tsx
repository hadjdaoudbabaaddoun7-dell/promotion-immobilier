import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useOfflineSync } from "@/contexts/OfflineSyncContext";
import { cacheServerForms, getCachedFormByDisplayId, toDisplayForm } from "@/lib/offlineDb";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { defaultIntakeFormValues, intakeFormInputSchema, type IntakeFormInput } from "@shared/intake";
import { ArrowLeft, Check, FileDown, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <section className="form-section"><div className="section-heading"><span>{number}</span><h2>{title}</h2></div>{children}</section>;
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return <div className="field-stack"><Label className="field-label">{label}</Label>{children}{error && <p className="field-error">{error}</p>}</div>;
}

function BooleanChoice({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="boolean-choice"><span>{label}</span><div className="boolean-control"><span className={checked ? "is-active" : ""}>Oui</span><Switch checked={checked} onCheckedChange={onChange} aria-label={label} /><span className={!checked ? "is-active" : ""}>Non</span></div></div>;
}

export default function IntakeFormPage() {
  const [, editParams] = useRoute("/fiches/:id/modifier");
  const editId = Number(editParams?.id);
  const isEditing = Number.isInteger(editId) && editId > 0;
  const isLocalOnlyRecord = editId > 2_147_483_647;
  const [, setLocation] = useLocation();
  const { activeWorkspace } = useWorkspace();
  const { saveForm, revision } = useOfflineSync();
  const recordQuery = trpc.intakeForms.get.useQuery({ id: isEditing ? editId : 1 }, { enabled: isEditing && !isLocalOnlyRecord && navigator.onLine });
  const form = useForm<IntakeFormInput>({ defaultValues: defaultIntakeFormValues });
  const [cachedRecord, setCachedRecord] = useState<ReturnType<typeof toDisplayForm> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) return;
    void getCachedFormByDisplayId(editId).then(record => setCachedRecord(record ? toDisplayForm(record) : null));
  }, [editId, isEditing, revision]);

  useEffect(() => {
    if (!recordQuery.data) return;
    void cacheServerForms([recordQuery.data as unknown as Record<string, unknown>]);
  }, [recordQuery.data]);

  const record = recordQuery.data ?? cachedRecord;
  useEffect(() => {
    if (record) form.reset(intakeFormInputSchema.parse(record));
  }, [form, record]);

  const watched = form.watch();
  const pending = saving;
  const updateBoolean = (name: keyof IntakeFormInput, value: boolean) => form.setValue(name as never, value as never, { shouldDirty: true });
  const onSubmit = async (data: IntakeFormInput) => {
    const parsed = intakeFormInputSchema.safeParse(data);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Veuillez vérifier les champs requis.");
      return;
    }
    try {
      setSaving(true);
      if (isEditing) {
        const result = await saveForm({ mode: "update", id: editId, data: parsed.data });
        toast.success(result.offline ? "Modifications enregistrées localement. Synchronisation en attente." : "La fiche a été synchronisée.");
        setLocation(`/fiches/${result.id}`);
      } else {
      if (!activeWorkspace) {
        toast.error("Sélectionnez un espace avant de créer une fiche.");
        return;
      }
        const result = await saveForm({ mode: "create", workspaceId: activeWorkspace.id, data: parsed.data });
        toast.success(result.offline ? "Fiche enregistrée localement. Synchronisation en attente." : "La fiche a été enregistrée et synchronisée.");
        setLocation(result.offline ? "/" : `/fiches/${result.id}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La fiche ne peut pas être enregistrée localement.");
    } finally {
      setSaving(false);
    }
  };

  if (isEditing && recordQuery.isLoading && !cachedRecord) return <div className="page-loading"><Loader2 className="animate-spin" /> Chargement de la fiche…</div>;
  if (isEditing && recordQuery.isError && !cachedRecord) return <div className="page-empty"><h1>Fiche introuvable</h1><Button onClick={() => setLocation("/")}>Retour aux fiches</Button></div>;

  const booleanOptions: Array<{ name: keyof IntakeFormInput; label: string }> = [
    { name: "parking", label: "Parking" },
    { name: "elevator", label: "Ascenseur" },
    { name: "playground", label: "Aire de jeux" },
    { name: "security", label: "Gardiennage" },
    { name: "smartHome", label: "Smart Home" },
  ];
  const housingOptions: Array<{ name: keyof IntakeFormInput; label: string }> = [
    { name: "housingF2", label: "F2" }, { name: "housingF3", label: "F3" }, { name: "housingF4", label: "F4" }, { name: "housingF5", label: "F5" }, { name: "housingDuplex", label: "Duplex" }, { name: "housingOther", label: "Autre" },
  ];
  const documentOptions: Array<{ name: keyof IntakeFormInput; label: string }> = [
    { name: "cadastralPlan", label: "Plan cadastral" }, { name: "urbanPlanningCertificate", label: "Certificat d'urbanisme" }, { name: "titleDeed", label: "Acte" }, { name: "landRegistryBook", label: "Livret foncier" }, { name: "otherDocument", label: "Autre" },
  ];

  return (
    <div className="form-page">
      <div className="page-header">
        <div><button className="back-link" onClick={() => setLocation(isEditing ? `/fiches/${editId}` : "/")}><ArrowLeft size={16} /> Retour</button><p className="eyebrow">Promotion immobilière</p><h1>{isEditing ? "Modifier la fiche" : "Nouvelle fiche"}</h1><p>{isEditing ? "Mettez à jour les informations de ce projet immobilier." : "Renseignez les éléments de la fiche d'introduction du projet."}</p></div>
        {isEditing && <Button variant="outline" className="screen-action" onClick={() => setLocation(`/fiches/${editId}/imprimer`)}><FileDown size={16} /> Exporter en PDF</Button>}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="intake-form" noValidate>
        <Section number="01" title="Identification du projet">
          <div className="field-grid three-columns">
            <Field label="Nom du dossier" error={form.formState.errors.projectName?.message}><Input {...form.register("projectName", { required: "Le Nom du dossier est requis." })} placeholder="Ex. Résidence Les Terrasses" /></Field>
            <Field label="Lieu" error={form.formState.errors.projectLocation?.message}><Input {...form.register("projectLocation", { required: "Le Lieu est requis." })} placeholder="Ville, commune ou quartier" /></Field>
            <Field label="Date de dépôt" error={form.formState.errors.submissionDate?.message}><Input type="date" {...form.register("submissionDate", { required: "La Date de dépôt est requise." })} /></Field>
          </div>
        </Section>

        <Section number="02" title="Fiche Technique">
          <div className="field-grid four-columns">
            <Field label="Sous-sols"><Input inputMode="numeric" {...form.register("basements")} placeholder="0" /></Field>
            <Field label="Entre-sol"><Input inputMode="numeric" {...form.register("mezzanines")} placeholder="0" /></Field>
            <Field label="Étages de service"><Input inputMode="numeric" {...form.register("serviceFloors")} placeholder="0" /></Field>
            <Field label="CES"><Input inputMode="decimal" {...form.register("ces")} placeholder="0,00" /></Field>
            <Field label="COS"><Input inputMode="decimal" {...form.register("cos")} placeholder="0,00" /></Field>
          </div>
          <div className="technical-choices">
            <div className="choice-group"><Label className="field-label">RDC (Commercial / Résidentiel)</Label><div className="choice-row"><label><Checkbox checked={watched.commercialGroundFloor} onCheckedChange={(value) => updateBoolean("commercialGroundFloor", value === true)} /> Commercial</label><label><Checkbox checked={watched.residentialGroundFloor} onCheckedChange={(value) => updateBoolean("residentialGroundFloor", value === true)} /> Résidentiel</label></div></div>
            <BooleanChoice label="Entresol de service" checked={watched.serviceMezzanine} onChange={(value) => updateBoolean("serviceMezzanine", value)} />
            <BooleanChoice label="Terrasse aménagée" checked={watched.landscapedTerrace} onChange={(value) => updateBoolean("landscapedTerrace", value)} />
          </div>
        </Section>

        <Section number="03" title="Programme des logements">
          <div className="checkbox-grid">{housingOptions.map(option => <label className="check-card" key={option.name}><Checkbox checked={Boolean(watched[option.name])} onCheckedChange={(value) => updateBoolean(option.name, value === true)} />{option.label}</label>)}</div>
        </Section>

        <Section number="04" title="Standing">
          <RadioGroup value={watched.standing} onValueChange={(value) => form.setValue("standing", value as IntakeFormInput["standing"], { shouldDirty: true })} className="standing-grid">
            {["Normal", "Moyen", "Haut"].map(option => <label className="standing-card" key={option} data-selected={watched.standing === option}><RadioGroupItem value={option} /> <span>{option}</span>{watched.standing === option && <Check size={15} />}</label>)}
          </RadioGroup>
        </Section>

        <Section number="05" title="Équipements & Services">
          <div className="equipment-grid">{booleanOptions.map(option => <BooleanChoice key={option.name} label={option.label} checked={Boolean(watched[option.name])} onChange={(value) => updateBoolean(option.name, value)} />)}</div>
          <div className="mt-5"><Field label="Autre"><Input {...form.register("otherEquipment")} placeholder="Précisez un équipement ou service complémentaire" /></Field></div>
        </Section>

        <Section number="06" title="Instructions spéciales (Contraintes / Exigences)">
          <Field label="Contraintes / Exigences"><Textarea {...form.register("specialInstructions")} className="min-h-32 resize-y" placeholder="Décrivez les contraintes, exigences ou informations particulières du projet." /></Field>
        </Section>

        <Section number="07" title="Documents transmis">
          <div className="checkbox-grid documents-grid">{documentOptions.map(option => <label className="check-card" key={option.name}><Checkbox checked={Boolean(watched[option.name])} onCheckedChange={(value) => updateBoolean(option.name, value === true)} />{option.label}</label>)}</div>
        </Section>

        <Section number="08" title="Validation & Signatures">
          <div className="field-grid two-columns">
            <Field label="Date de transmission" error={form.formState.errors.transmissionDate?.message}><Input type="date" {...form.register("transmissionDate", { required: "La Date de transmission est requise." })} /></Field>
            <Field label="Signataire émetteur"><Input {...form.register("senderSignature")} placeholder="Nom et signature" /></Field>
            <Field label="Date de réception" error={form.formState.errors.receptionDate?.message}><Input type="date" {...form.register("receptionDate", { required: "La Date de réception est requise." })} /></Field>
            <Field label="Signataire récepteur"><Input {...form.register("recipientSignature")} placeholder="Nom et signature" /></Field>
          </div>
        </Section>

        <div className="form-actions"><Button type="button" variant="outline" onClick={() => setLocation(isEditing ? `/fiches/${editId}` : "/")}>Annuler</Button><Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Save size={16} />}{isEditing ? "Enregistrer les modifications" : "Enregistrer la fiche"}</Button></div>
      </form>
    </div>
  );
}
