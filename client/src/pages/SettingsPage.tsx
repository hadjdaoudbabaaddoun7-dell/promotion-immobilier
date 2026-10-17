import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { Building2, Check, Loader2, Plus, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user } = useAuth();
  const { workspaces, activeWorkspace, setActiveWorkspaceId } = useWorkspace();
  const utils = trpc.useUtils();
  const [displayName, setDisplayName] = useState(user?.displayName || user?.name || "");
  const [workspaceName, setWorkspaceName] = useState("");
  const profileMutation = trpc.profile.updateDisplayName.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); toast.success("Votre nom d’affichage a été enregistré."); }, onError: error => toast.error(error.message) });
  const workspaceMutation = trpc.workspaces.create.useMutation({ onSuccess: async workspace => { await utils.workspaces.list.invalidate(); setActiveWorkspaceId(workspace.id); setWorkspaceName(""); toast.success("Le nouvel espace est prêt."); }, onError: error => toast.error(error.message) });
  const submitProfile = (event: FormEvent) => { event.preventDefault(); profileMutation.mutate({ displayName }); };
  const submitWorkspace = (event: FormEvent) => { event.preventDefault(); if (!workspaceName.trim()) return; workspaceMutation.mutate({ name: workspaceName }); };
  return <div className="settings-page"><div className="page-header"><div><p className="eyebrow">Compte et collaboration</p><h1>Paramètres</h1><p>Personnalisez votre identité et organisez les espaces de travail auxquels vous appartenez.</p></div></div><div className="settings-grid"><section className="settings-card"><div className="settings-card-heading"><div className="settings-icon"><UserRound size={18} /></div><div><h2>Profil</h2><p>Ce nom sera affiché dans l’historique et les membres d’espace.</p></div></div><form onSubmit={submitProfile} className="settings-form"><div><Label>Nom d’affichage</Label><Input value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Votre nom d’affichage" maxLength={120} /></div><p className="account-caption">Compte connecté : {user?.email || "—"}</p><Button type="submit" disabled={profileMutation.isPending}>{profileMutation.isPending ? <Loader2 className="animate-spin" /> : <Check size={16} />} Enregistrer le profil</Button></form></section><section className="settings-card"><div className="settings-card-heading"><div className="settings-icon"><Building2 size={18} /></div><div><h2>Espaces</h2><p>Créez un environnement séparé pour chaque équipe ou portefeuille.</p></div></div><form onSubmit={submitWorkspace} className="settings-form"><div><Label>Nom du nouvel espace</Label><Input value={workspaceName} onChange={event => setWorkspaceName(event.target.value)} placeholder="Ex. Direction commerciale" maxLength={120} /></div><Button type="submit" disabled={!workspaceName.trim() || workspaceMutation.isPending}>{workspaceMutation.isPending ? <Loader2 className="animate-spin" /> : <Plus size={16} />} Créer un espace</Button></form><div className="workspace-settings-list">{workspaces.map(workspace => <button key={workspace.id} onClick={() => setActiveWorkspaceId(workspace.id)} className="workspace-settings-item" data-active={workspace.id === activeWorkspace?.id}><span>{workspace.name}</span><em>{workspace.role === "admin" ? "Administrateur" : "Membre"}</em></button>)}</div></section></div></div>;
}
