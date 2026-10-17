import { IntakePrintSheet } from "@/components/IntakePrintSheet";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { intakeFormInputSchema } from "@shared/intake";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { useLocation, useRoute } from "wouter";

export default function SharedPrintPage() {
  const [, params] = useRoute("/partage/:token/imprimer");
  const token = params?.token ?? "";
  const [, setLocation] = useLocation();
  const shareQuery = trpc.sharedForms.get.useQuery({ token }, { enabled: Boolean(token) });
  if (shareQuery.isLoading) return <div className="page-loading"><Loader2 className="animate-spin" /> Préparation de l’impression…</div>;
  if (shareQuery.isError || !shareQuery.data) return <div className="shared-error"><h1>Lien inaccessible</h1><p>Ce lien est invalide ou a été révoqué.</p></div>;
  const fiche = intakeFormInputSchema.parse(shareQuery.data.form);
  return <main className="print-page"><div className="print-controls"><div><p className="eyebrow">Fiche partagée</p><h1>Version imprimable</h1><p>Choisissez « Enregistrer au format PDF » dans la boîte de dialogue d’impression.</p></div><div className="header-actions"><Button variant="outline" onClick={() => setLocation(`/partage/${token}`)}><ArrowLeft size={16} /> Retour</Button><Button onClick={() => window.print()}><Printer size={16} /> Imprimer / Enregistrer en PDF</Button></div></div><IntakePrintSheet fiche={fiche} /></main>;
}
