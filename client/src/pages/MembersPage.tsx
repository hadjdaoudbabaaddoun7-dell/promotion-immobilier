import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { MailPlus, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export default function MembersPage() {
  const { activeWorkspace } = useWorkspace();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const membersQuery = trpc.workspaces.members.useQuery({ workspaceId: activeWorkspace?.id ?? 0 }, { enabled: Boolean(activeWorkspace) });
  const invitesQuery = trpc.workspaces.invitations.useQuery({ workspaceId: activeWorkspace?.id ?? 0 }, { enabled: Boolean(activeWorkspace?.role === "admin") });
  const inviteMutation = trpc.workspaces.invite.useMutation({ onSuccess: async () => { await Promise.all([utils.workspaces.members.invalidate(), utils.workspaces.invitations.invalidate()]); setEmail(""); toast.success("L’invitation a été enregistrée. Elle sera activée lorsque cette adresse se connectera."); }, onError: error => toast.error(error.message) });
  const removeMutation = trpc.workspaces.removeMember.useMutation({ onSuccess: async () => { await utils.workspaces.members.invalidate(); toast.success("Le membre a été retiré de l’espace."); }, onError: error => toast.error(error.message) });
  const submit = (event: FormEvent) => { event.preventDefault(); if (activeWorkspace) inviteMutation.mutate({ workspaceId: activeWorkspace.id, email, role: "member" }); };
  if (!activeWorkspace) return <div className="page-empty"><UsersRound size={25} /><h1>Aucun espace sélectionné</h1></div>;
  const isAdmin = activeWorkspace.role === "admin";
  return <div className="members-page"><div className="page-header"><div><p className="eyebrow">{activeWorkspace.name}</p><h1>Membres de l’espace</h1><p>Les Administrateurs organisent les membres. Les Membres peuvent travailler sur les fiches, les archives et la Corbeille.</p></div></div>{isAdmin && <section className="invite-panel"><div><h2>Inviter un membre</h2><p>Saisissez l’adresse utilisée par la personne lors de sa connexion.</p></div><form onSubmit={submit}><Label className="sr-only">Adresse email</Label><Input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="collaborateur@exemple.com" /><Button type="submit" disabled={!email || inviteMutation.isPending}><MailPlus size={16} /> Inviter</Button></form></section>}<section className="member-panel"><div className="records-heading"><div><h2>Membres actuels</h2><p>{membersQuery.data?.length ?? 0} membre(s) dans cet espace</p></div></div><div className="member-list">{membersQuery.data?.map(member => <article className="member-row" key={member.id}><div className="member-avatar">{(member.displayName || member.name || member.email || "U").charAt(0).toUpperCase()}</div><div><h3>{member.displayName || member.name || "Utilisateur"}</h3><p>{member.email || "Email non renseigné"}</p></div><span className="role-badge"><ShieldCheck size={13} /> {member.workspaceRole === "admin" ? "Administrateur" : "Membre"}</span>{isAdmin && member.workspaceRole !== "admin" && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeMutation.mutate({ workspaceId: activeWorkspace.id, userId: member.id })}><Trash2 size={15} /> Retirer</Button>}</article>)}</div></section>{isAdmin && invitesQuery.data?.length ? <section className="member-panel pending-panel"><div className="records-heading"><div><h2>Invitations</h2><p>En attente de connexion</p></div></div>{invitesQuery.data.filter(invite => !invite.acceptedAt).map(invite => <div className="pending-invite" key={invite.id}><span>{invite.email}</span><em>En attente</em></div>)}</section> : null}</div>;
}
