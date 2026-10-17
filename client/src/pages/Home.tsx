import { HistoryDialog } from "@/components/HistoryDialog";
import { ShareDialog } from "@/components/ShareDialog";
import { TransferDialog } from "@/components/TransferDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useOfflineSync } from "@/contexts/OfflineSyncContext";
import { cacheServerForms, listCachedForms, toDisplayForm } from "@/lib/offlineDb";
import { trpc } from "@/lib/trpc";
import { formatFrenchDate } from "@shared/intake";
import { Archive, ArrowUpRight, CloudOff, Eye, FileDown, FilePlus2, FolderArchive, FolderOpen, History, Loader2, MapPin, Pencil, RotateCcw, Search, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

type FormState = "active" | "archived" | "trashed";
const stateCopy: Record<FormState, { title: string; eyebrow: string; empty: string }> = {
  active: { title: "Toutes les fiches", eyebrow: "Fiches actives", empty: "Aucune fiche active dans cet espace." },
  archived: { title: "Archives", eyebrow: "Dossiers classés", empty: "Aucune fiche archivée dans cet espace." },
  trashed: { title: "Corbeille", eyebrow: "Récupération pendant 30 jours", empty: "Aucune fiche dans la Corbeille." },
};

function WorkspaceFormsView({ state }: { state: FormState }) {
  const [queryInput, setQueryInput] = useState("");
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const { activeWorkspace, loading: workspaceLoading } = useWorkspace();
  const { online, revision } = useOfflineSync();
  const utils = trpc.useUtils();
  const formsQuery = trpc.intakeForms.list.useQuery({ workspaceId: activeWorkspace?.id ?? 0, state, search: search || undefined }, { enabled: Boolean(activeWorkspace) });
  const [cachedForms, setCachedForms] = useState<Array<ReturnType<typeof toDisplayForm>>>([]);
  useEffect(() => {
    if (!activeWorkspace) return;
    void listCachedForms(activeWorkspace.id, state).then(records => setCachedForms(records.map(toDisplayForm)));
  }, [activeWorkspace?.id, revision, state]);
  useEffect(() => {
    if (!formsQuery.data) return;
    void cacheServerForms(formsQuery.data as unknown as Array<Record<string, unknown>>).then(() => {
      if (!activeWorkspace) return;
      return listCachedForms(activeWorkspace.id, state).then(records => setCachedForms(records.map(toDisplayForm)));
    });
  }, [activeWorkspace, formsQuery.data, state]);
  const archiveMutation = trpc.intakeForms.archive.useMutation({ onSuccess: async () => { await utils.intakeForms.list.invalidate(); toast.success("La fiche a été placée dans les Archives."); }, onError: error => toast.error(error.message) });
  const restoreMutation = trpc.intakeForms.restore.useMutation({ onSuccess: async () => { await utils.intakeForms.list.invalidate(); toast.success("La fiche a été restaurée dans les fiches actives."); }, onError: error => toast.error(error.message) });
  const trashMutation = trpc.intakeForms.trash.useMutation({ onSuccess: async () => { await utils.intakeForms.list.invalidate(); toast.success("La fiche a été déplacée dans la Corbeille pendant 30 jours."); }, onError: error => toast.error(error.message) });
  const submitSearch = (event: FormEvent) => { event.preventDefault(); setSearch(queryInput.trim()); };
  const forms = (formsQuery.data ?? cachedForms).filter(fiche => !search || `${fiche.projectName} ${fiche.projectLocation}`.toLowerCase().includes(search.toLowerCase()));
  const copy = stateCopy[state];
  const isBusy = archiveMutation.isPending || restoreMutation.isPending || trashMutation.isPending;

  if (workspaceLoading) return <div className="page-loading"><Loader2 className="animate-spin" /> Préparation de l’espace…</div>;
  if (!activeWorkspace) return <div className="page-empty"><FolderOpen size={25} /><h1>Aucun espace disponible</h1><p>Créez un espace depuis les paramètres pour commencer à collaborer.</p><Button onClick={() => setLocation("/parametres")}>Ouvrir les paramètres</Button></div>;

  const offlineOnlyNotice = <Button variant="ghost" size="sm" disabled title="Cette action sera disponible après synchronisation."><CloudOff size={15} /> En ligne requise</Button>;
  const rowActions = (fiche: typeof forms[number]) => <div className="table-actions workspace-actions"><Button variant="ghost" size="sm" onClick={() => setLocation(`/fiches/${fiche.id}`)}><Eye size={15} /> Voir</Button>{state === "active" && <><Button variant="ghost" size="sm" onClick={() => setLocation(`/fiches/${fiche.id}/modifier`)}><Pencil size={15} /> Modifier</Button>{online ? <><ShareDialog intakeFormId={fiche.id} compact /><HistoryDialog intakeFormId={fiche.id} compact /><TransferDialog intakeFormId={fiche.id} compact /><Button variant="ghost" size="sm" onClick={() => archiveMutation.mutate({ id: fiche.id })}><Archive size={15} /> Archiver</Button><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => trashMutation.mutate({ id: fiche.id })}><Trash2 size={15} /> Corbeille</Button></> : offlineOnlyNotice}</>}{state === "archived" && (online ? <><HistoryDialog intakeFormId={fiche.id} compact /><Button variant="ghost" size="sm" onClick={() => restoreMutation.mutate({ id: fiche.id })}><RotateCcw size={15} /> Restaurer</Button><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => trashMutation.mutate({ id: fiche.id })}><Trash2 size={15} /> Corbeille</Button></> : offlineOnlyNotice)}{state === "trashed" && (online ? <><HistoryDialog intakeFormId={fiche.id} compact /><Button variant="ghost" size="sm" onClick={() => restoreMutation.mutate({ id: fiche.id })}><RotateCcw size={15} /> Restaurer</Button></> : offlineOnlyNotice)}</div>;

  return <div className="dashboard-page"><div className="dashboard-hero"><div><p className="eyebrow">{copy.eyebrow} · {activeWorkspace.name}</p><h1>{copy.title}</h1><p>{state === "active" ? "Centralisez les informations techniques et administratives de vos opérations immobilières." : state === "archived" ? "Conservez les dossiers finalisés hors de la liste active, tout en gardant leur historique." : "Les fiches peuvent être restaurées pendant 30 jours avant suppression automatique."}</p></div>{state === "active" && <Button onClick={() => setLocation("/nouvelle-fiche")}><FilePlus2 size={17} /> Nouvelle fiche</Button>}</div><div className="dashboard-tools"><form className="search-box" onSubmit={submitSearch}><Search size={18} /><Input value={queryInput} onChange={event => setQueryInput(event.target.value)} placeholder="Rechercher par Nom du dossier ou Lieu" /><button type="submit">Rechercher</button></form><div className="counter-card"><span>{copy.eyebrow}</span><strong>{formsQuery.isLoading && !cachedForms.length ? "—" : forms.length}</strong></div></div><section className="records-panel"><div className="records-heading"><div><h2>{copy.title}</h2><p>{!online ? "Données enregistrées localement" : search ? `Résultats pour « ${search} »` : "Espace actuellement sélectionné"}</p></div></div>{formsQuery.isLoading && !cachedForms.length ? <div className="state-area"><Loader2 className="animate-spin" /> Chargement des fiches…</div> : formsQuery.isError && !cachedForms.length ? <div className="state-area error-state">Les fiches ne peuvent pas être chargées actuellement.</div> : forms.length === 0 ? <div className="empty-state"><div className="empty-icon">{state === "archived" ? <FolderArchive size={25} /> : state === "trashed" ? <Trash2 size={25} /> : <FolderOpen size={25} />}</div><h3>{copy.empty}</h3>{state === "active" && <Button onClick={() => setLocation("/nouvelle-fiche")}><FilePlus2 size={16} /> Nouvelle fiche</Button>}</div> : <><div className="records-table-wrap"><table className="records-table"><thead><tr><th>Nom du dossier</th><th>Lieu</th><th>Date de dépôt</th><th>Standing</th><th className="text-right">Actions</th></tr></thead><tbody>{forms.map(fiche => <tr key={fiche.id}><td><button className="record-title" onClick={() => setLocation(`/fiches/${fiche.id}`)}>{fiche.projectName}<ArrowUpRight size={14} /></button></td><td><span className="record-location"><MapPin size={14} />{fiche.projectLocation}</span></td><td>{formatFrenchDate(fiche.submissionDate)}</td><td><span className="standing-badge">{fiche.standing}</span></td><td>{rowActions(fiche)}</td></tr>)}</tbody></table></div><div className="records-cards">{forms.map(fiche => <article className="record-card" key={fiche.id}><div><span className="standing-badge">{fiche.standing}</span><h3>{fiche.projectName}</h3><p><MapPin size={14} /> {fiche.projectLocation}</p><small>Date de dépôt : {formatFrenchDate(fiche.submissionDate)}</small></div><div className="card-actions">{rowActions(fiche)}</div></article>)}</div></>}</section>{isBusy && <div className="dashboard-busy">Mise à jour de la fiche…</div>}</div>;
}

export default function Home() { return <WorkspaceFormsView state="active" />; }
export function ArchivePage() { return <WorkspaceFormsView state="archived" />; }
export function TrashPage() { return <WorkspaceFormsView state="trashed" />; }
