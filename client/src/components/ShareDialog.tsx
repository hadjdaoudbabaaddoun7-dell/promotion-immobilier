import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import type { SharePermission } from "@shared/intake";
import { Check, Copy, Link2, Loader2, Share2, ShieldOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function ShareDialog({ intakeFormId, compact = false }: { intakeFormId: number; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<SharePermission>("view");
  const [copied, setCopied] = useState(false);
  const utils = trpc.useUtils();
  const shareQuery = trpc.shareLinks.get.useQuery({ intakeFormId });
  const saveMutation = trpc.shareLinks.save.useMutation({
    onSuccess: async () => {
      await utils.shareLinks.get.invalidate({ intakeFormId });
      toast.success("Le lien de partage est prêt.");
    },
    onError: error => toast.error(error.message),
  });
  const revokeMutation = trpc.shareLinks.revoke.useMutation({
    onSuccess: async () => {
      await utils.shareLinks.get.invalidate({ intakeFormId });
      toast.success("Le lien de partage a été révoqué.");
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (shareQuery.data?.permission) setPermission(shareQuery.data.permission);
  }, [shareQuery.data?.permission]);

  const activeShare = shareQuery.data?.isActive ? shareQuery.data : undefined;
  const shareUrl = activeShare && typeof window !== "undefined" ? `${window.location.origin}/partage/${activeShare.token}` : "";
  const saving = saveMutation.isPending || revokeMutation.isPending;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Le lien a été copié.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Copiez le lien manuellement depuis le champ ci-dessous.");
    }
  };

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant={compact ? "ghost" : "outline"} size={compact ? "sm" : "default"} className={compact ? "text-slate-600" : ""}><Share2 size={compact ? 15 : 16} /> Partager</Button></DialogTrigger>
    <DialogContent className="sm:max-w-xl">
      <DialogHeader><DialogTitle>Partager la fiche</DialogTitle><DialogDescription>Créez un lien sécurisé pour permettre à une autre personne de consulter ou de modifier cette fiche, sans accès à votre espace personnel.</DialogDescription></DialogHeader>
      <div className="space-y-5 py-1">
        <div><Label className="field-label">Niveau d’accès</Label><RadioGroup value={permission} onValueChange={value => setPermission(value as SharePermission)} className="grid grid-cols-1 gap-2 sm:grid-cols-2"><label className="share-permission-card" data-selected={permission === "view"}><RadioGroupItem value="view" /><span><strong>Lecture seule</strong><small>Consultation et impression uniquement.</small></span></label><label className="share-permission-card" data-selected={permission === "edit"}><RadioGroupItem value="edit" /><span><strong>Éditeur</strong><small>Consultation, impression et modification.</small></span></label></RadioGroup></div>
        {activeShare ? <div className="space-y-2"><Label className="field-label">Lien de partage actif</Label><div className="flex gap-2"><Input value={shareUrl} readOnly aria-label="Lien de partage" /><Button type="button" variant="outline" size="icon" onClick={copyLink} aria-label="Copier le lien">{copied ? <Check size={16} /> : <Copy size={16} />}</Button></div><p className="text-xs text-muted-foreground">Ce lien est actuellement configuré en accès <strong>{activeShare.permission === "view" ? "lecture seule" : "éditeur"}</strong>.</p></div> : <div className="share-empty"><Link2 size={18} /><span>Aucun lien actif. Sélectionnez un niveau d’accès puis générez un lien unique.</span></div>}
      </div>
      <DialogFooter className="gap-2 sm:justify-between"><Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto" disabled={!activeShare || saving} onClick={() => revokeMutation.mutate({ intakeFormId })}><ShieldOff size={16} /> Révoquer le lien</Button><Button type="button" disabled={saving} onClick={() => saveMutation.mutate({ intakeFormId, permission })}>{saving ? <Loader2 className="animate-spin" /> : <Share2 size={16} />}{activeShare ? "Mettre à jour le lien" : "Générer le lien"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
