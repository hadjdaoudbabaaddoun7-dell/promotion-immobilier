import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function TransferDialog({ intakeFormId, compact = false }: { intakeFormId: number; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const { activeWorkspace, workspaces } = useWorkspace();
  const [targetId, setTargetId] = useState("");
  const utils = trpc.useUtils();
  const transfer = trpc.intakeForms.transfer.useMutation({ onSuccess: async () => { await utils.intakeForms.list.invalidate(); toast.success("La fiche a été transférée."); setOpen(false); }, onError: error => toast.error(error.message) });
  const targets = workspaces.filter(workspace => workspace.id !== activeWorkspace?.id);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant={compact ? "ghost" : "outline"} size={compact ? "sm" : "default"}><ArrowRightLeft size={compact ? 15 : 16} /> Transférer</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Transférer vers un autre espace</DialogTitle><DialogDescription>La fiche sera retirée de l’espace actuel et accessible dans l’espace de destination.</DialogDescription></DialogHeader>{targets.length ? <div className="space-y-2"><Label>Nouvel espace</Label><select className="workspace-native-select" value={targetId} onChange={event => setTargetId(event.target.value)}><option value="">Sélectionner un espace</option>{targets.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></div> : <p className="text-sm text-muted-foreground">Vous devez appartenir à un second espace pour effectuer un transfert.</p>}<DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button disabled={!targetId || transfer.isPending} onClick={() => transfer.mutate({ id: intakeFormId, targetWorkspaceId: Number(targetId) })}>{transfer.isPending ? <Loader2 className="animate-spin" /> : <ArrowRightLeft size={16} />} Transférer</Button></DialogFooter></DialogContent></Dialog>;
}
