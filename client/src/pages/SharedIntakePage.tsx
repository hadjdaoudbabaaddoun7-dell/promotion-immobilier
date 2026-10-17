import { IntakePrintSheet } from "@/components/IntakePrintSheet";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { formatFrenchDate, intakeFormInputSchema } from "@shared/intake";
import { CalendarDays, FileDown, Loader2, MapPin, Pencil, ShieldCheck } from "lucide-react";
import { useLocation, useRoute } from "wouter";

export default function SharedIntakePage() {
  const [, params] = useRoute("/partage/:token");
  const token = params?.token ?? "";
  const [, setLocation] = useLocation();
  const shareQuery = trpc.sharedForms.get.useQuery({ token }, { enabled: Boolean(token) });
  if (shareQuery.isLoading) return <div className="page-loading"><Loader2 className="animate-spin" /> Ouverture de la fiche partagée…</div>;
  if (shareQuery.isError || !shareQuery.data) return <div className="shared-error"><ShieldCheck size={28} /><p className="eyebrow">Lien privé</p><h1>Lien inaccessible</h1><p>Ce lien est invalide, a été révoqué ou n’est plus disponible.</p></div>;
  const fiche = intakeFormInputSchema.parse(shareQuery.data.form);
  const canEdit = shareQuery.data.permission === "edit";
  return <div className="shared-page"><div className="shared-banner"><ShieldCheck size={16} /><span>Vous consultez une fiche partagée</span><strong>{canEdit ? "Accès éditeur" : "Lecture seule"}</strong></div><div className="detail-page shared-detail"><div className="page-header detail-header"><div><p className="eyebrow">Fiche partagée</p><h1>{fiche.projectName}</h1><div className="detail-meta"><span><MapPin size={15} /> {fiche.projectLocation}</span><span><CalendarDays size={15} /> Dépôt le {formatFrenchDate(fiche.submissionDate)}</span></div></div><div className="header-actions"><Button variant="outline" onClick={() => setLocation(`/partage/${token}/imprimer`)}><FileDown size={16} /> Imprimer</Button>{canEdit && <Button onClick={() => setLocation(`/partage/${token}/modifier`)}><Pencil size={16} /> Modifier</Button>}</div></div><div className="preview-shell"><div className="preview-ribbon">Fiche partagée</div><IntakePrintSheet fiche={fiche} /></div></div></div>;
}
