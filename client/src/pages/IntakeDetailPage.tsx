import { HistoryDialog } from "@/components/HistoryDialog";
import { IntakePrintSheet } from "@/components/IntakePrintSheet";
import { ShareDialog } from "@/components/ShareDialog";
import { TransferDialog } from "@/components/TransferDialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useOfflineSync } from "@/contexts/OfflineSyncContext";
import { cacheServerForms, getCachedFormByDisplayId, toDisplayForm } from "@/lib/offlineDb";
import { formatFrenchDate, intakeFormInputSchema } from "@shared/intake";
import { Archive, ArrowLeft, CalendarDays, CloudOff, FileDown, Loader2, MapPin, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";

export default function IntakeDetailPage() {
  const [, params] = useRoute("/fiches/:id");
  const id = Number(params?.id);
  const isLocalOnlyRecord = id > 2_147_483_647;
  const [, setLocation] = useLocation();
  const { online, revision } = useOfflineSync();
  const utils = trpc.useUtils();
  const recordQuery = trpc.intakeForms.get.useQuery({ id: Number.isInteger(id) && id > 0 ? id : 1 }, { enabled: Number.isInteger(id) && id > 0 && !isLocalOnlyRecord && online });
  const [cachedRecord, setCachedRecord] = useState<ReturnType<typeof toDisplayForm> | null>(null);
  useEffect(() => { if (Number.isInteger(id) && id > 0) void getCachedFormByDisplayId(id).then(record => setCachedRecord(record ? toDisplayForm(record) : null)); }, [id, revision]);
  useEffect(() => { if (recordQuery.data) void cacheServerForms([recordQuery.data as unknown as Record<string, unknown>]); }, [recordQuery.data]);
  const archive = trpc.intakeForms.archive.useMutation({ onSuccess: async () => { await utils.intakeForms.invalidate(); toast.success("La fiche est dans les Archives."); setLocation("/archives"); }, onError: error => toast.error(error.message) });
  const restore = trpc.intakeForms.restore.useMutation({ onSuccess: async () => { await utils.intakeForms.invalidate(); toast.success("La fiche a été restaurée."); setLocation("/"); }, onError: error => toast.error(error.message) });
  const trash = trpc.intakeForms.trash.useMutation({ onSuccess: async () => { await utils.intakeForms.invalidate(); toast.success("La fiche est dans la Corbeille pendant 30 jours."); setLocation("/corbeille"); }, onError: error => toast.error(error.message) });
  const record = recordQuery.data ?? cachedRecord;
  if (recordQuery.isLoading && !record) return <div className="page-loading"><Loader2 className="animate-spin" /> Chargement de la fiche…</div>;
  if (recordQuery.isError && !record) return <div className="page-empty"><h1>Fiche introuvable</h1><Button onClick={() => setLocation("/")}>Retour aux fiches</Button></div>;
  if (!record) return <div className="page-empty"><h1>Fiche introuvable</h1><Button onClick={() => setLocation("/")}>Retour aux fiches</Button></div>;
  const fiche = intakeFormInputSchema.parse(record);
  const lifecycle = record.lifecycleState;
  return <div className="detail-page"><div className="page-header detail-header"><div><button className="back-link" onClick={() => setLocation(lifecycle === "archived" ? "/archives" : lifecycle === "trashed" ? "/corbeille" : "/")}><ArrowLeft size={16} /> Retour aux fiches</button><p className="eyebrow">{!online ? "Disponible hors ligne" : lifecycle === "active" ? "Fiche active" : lifecycle === "archived" ? "Fiche archivée" : "Dans la Corbeille"}</p><h1>{fiche.projectName}</h1><div className="detail-meta"><span><MapPin size={15} /> {fiche.projectLocation}</span><span><CalendarDays size={15} /> Dépôt le {formatFrenchDate(fiche.submissionDate)}</span></div></div><div className="header-actions">{!online && <Button variant="outline" disabled title="Les actions de partage, transfert, historique et cycle de vie reprendront après reconnexion."><CloudOff size={16} /> Actions avancées après reconnexion</Button>}{online && <HistoryDialog intakeFormId={id} />}{lifecycle === "active" && <>{online && <><ShareDialog intakeFormId={id} /><TransferDialog intakeFormId={id} /><Button variant="outline" onClick={() => archive.mutate({ id })}><Archive size={16} /> Archiver</Button><Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => trash.mutate({ id })}><Trash2 size={16} /> Corbeille</Button></>}<Button variant="outline" onClick={() => setLocation(`/fiches/${id}/imprimer`)}><FileDown size={16} /> Exporter en PDF</Button><Button onClick={() => setLocation(`/fiches/${id}/modifier`)}><Pencil size={16} /> Modifier</Button></>}{online && lifecycle === "archived" && <><Button onClick={() => restore.mutate({ id })}><RotateCcw size={16} /> Restaurer</Button><Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => trash.mutate({ id })}><Trash2 size={16} /> Corbeille</Button></>}{online && lifecycle === "trashed" && <Button onClick={() => restore.mutate({ id })}><RotateCcw size={16} /> Restaurer</Button>}</div></div><div className="preview-shell"><div className="preview-ribbon">Aperçu de la fiche</div><IntakePrintSheet fiche={fiche} /></div></div>;
}
