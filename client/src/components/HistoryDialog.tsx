import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { History, Loader2 } from "lucide-react";
import { useState } from "react";

const actionLabels: Record<string, string> = { created: "Fiche créée", updated: "Fiche modifiée", archived: "Fiche archivée", restored: "Fiche restaurée", trashed: "Placée dans la Corbeille", transferred: "Espace modifié" };

export function HistoryDialog({ intakeFormId, compact = false }: { intakeFormId: number; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const history = trpc.intakeForms.history.useQuery({ id: intakeFormId }, { enabled: open });
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant={compact ? "ghost" : "outline"} size={compact ? "sm" : "default"}><History size={compact ? 15 : 16} /> Historique</Button></DialogTrigger><DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Historique de la fiche</DialogTitle><DialogDescription>Chaque modification conserve son auteur, sa date et le détail des champs concernés.</DialogDescription></DialogHeader>{history.isLoading ? <div className="state-area"><Loader2 className="animate-spin" /> Chargement de l’historique…</div> : history.data?.length ? <div className="history-list">{history.data.map(entry => { const parsed = JSON.parse(entry.diffJson) as { fields?: Array<{ label: string; before: unknown; after: unknown }> }; return <article className="history-entry" key={entry.id}><div className="history-entry-head"><div><strong>{actionLabels[entry.action] ?? entry.action}</strong><span>par {entry.actorDisplayName}</span></div><time>{new Date(entry.createdAt).toLocaleString("fr-FR")}</time></div>{parsed.fields?.map((field, index) => <div className="history-diff" key={`${entry.id}-${index}`}><strong>{field.label}</strong><span><em>Avant</em> {String(field.before ?? "—")}</span><span><em>Après</em> {String(field.after ?? "—")}</span></div>)}</article>; })}</div> : <div className="state-area">Aucune modification enregistrée.</div>}</DialogContent></Dialog>;
}
