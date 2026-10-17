import { IntakePrintSheet } from "@/components/IntakePrintSheet";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { intakeFormInputSchema } from "@shared/intake";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { useLocation, useRoute } from "wouter";

export default function PrintPage() {
  const [, params] = useRoute("/fiches/:id/imprimer");
  const id = Number(params?.id);
  const [, setLocation] = useLocation();
  const recordQuery = trpc.intakeForms.get.useQuery({ id: Number.isInteger(id) && id > 0 ? id : 1 }, { enabled: Number.isInteger(id) && id > 0 });
  if (recordQuery.isLoading) return <div className="page-loading"><Loader2 className="animate-spin" /> Préparation de l'export…</div>;
  if (recordQuery.isError || !recordQuery.data) return <div className="page-empty"><h1>Fiche introuvable</h1><Button onClick={() => setLocation("/")}>Retour aux fiches</Button></div>;
  const fiche = intakeFormInputSchema.parse(recordQuery.data);
  return <main className="print-page"><div className="print-controls"><div><p className="eyebrow">Export de la fiche</p><h1>Version imprimable</h1><p>Choisissez « Enregistrer au format PDF » dans la boîte de dialogue d’impression.</p></div><div className="header-actions"><Button variant="outline" onClick={() => setLocation(`/fiches/${id}`)}><ArrowLeft size={16} /> Retour</Button><Button onClick={() => window.print()}><Printer size={16} /> Imprimer / Enregistrer en PDF</Button></div></div><IntakePrintSheet fiche={fiche} /></main>;
}
