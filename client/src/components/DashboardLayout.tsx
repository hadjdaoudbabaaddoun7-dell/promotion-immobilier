import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useIsMobile } from "@/hooks/useMobile";
import { Archive, Building2, ClipboardList, FilePlus2, LogOut, Settings, Trash2, UsersRound } from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { PwaControls } from "./PwaControls";

const menuItems = [
  { icon: ClipboardList, label: "Fiches", path: "/" },
  { icon: FilePlus2, label: "Nouvelle fiche", path: "/nouvelle-fiche" },
  { icon: Archive, label: "Archives", path: "/archives" },
  { icon: Trash2, label: "Corbeille", path: "/corbeille" },
  { icon: UsersRound, label: "Membres", path: "/membres" },
  { icon: Settings, label: "Paramètres", path: "/parametres" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();

  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return <div className="login-screen"><div className="login-card"><div className="brand-mark"><Building2 size={23} /></div><p className="eyebrow">Promotion immobilière</p><h1>Votre espace de gestion</h1><p>Connectez-vous pour accéder à vos fiches de projet enregistrées.</p><Button onClick={() => startLogin()} size="lg" className="w-full">Se connecter</Button></div></div>;
  }

  return <SidebarProvider><DashboardLayoutContent>{children}</DashboardLayoutContent></SidebarProvider>;
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { workspaces, activeWorkspace, setActiveWorkspaceId } = useWorkspace();
  const [location, setLocation] = useLocation();
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const activeMenuItem = menuItems.find(item => location === item.path) ?? menuItems[0];
  const displayName = user?.displayName || user?.name || "Utilisateur";

  return <>
    <Sidebar collapsible="icon" className="border-r border-slate-200/80 bg-[#fbfbf9]">
      <SidebarHeader className="h-auto min-h-28 px-3 py-4">
        <div className="brand-lockup">
          <button onClick={toggleSidebar} className="brand-mark" aria-label="Réduire la navigation"><Building2 size={20} /></button>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="brand-title">promotion immobilier</p>
            <p className="brand-subtitle">PILOTAGE DE PROJETS</p>
          </div>
        </div>
        <div className="workspace-switcher group-data-[collapsible=icon]:hidden">
          <label>Espace actif</label>
          <select value={activeWorkspace?.id ?? ""} onChange={event => setActiveWorkspaceId(Number(event.target.value))}>
            {workspaces.map(workspace => <option value={workspace.id} key={workspace.id}>{workspace.name}</option>)}
          </select>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <p className="sidebar-caption group-data-[collapsible=icon]:hidden">Gestion</p>
        <SidebarMenu>
          {menuItems.map(item => <SidebarMenuItem key={item.path}>
            <SidebarMenuButton isActive={location === item.path} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-11 rounded-xl text-slate-600 data-[active=true]:bg-slate-900 data-[active=true]:text-white"><item.icon size={17} /><span>{item.label}</span></SidebarMenuButton>
          </SidebarMenuItem>)}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <PwaControls />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="user-menu"><Avatar className="h-9 w-9"><AvatarFallback className="bg-stone-200 text-slate-700 text-xs">{displayName.charAt(0).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0 group-data-[collapsible=icon]:hidden"><p>{displayName}</p><span>{user?.email || ""}</span></div></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52"><DropdownMenuItem onClick={() => setLocation("/parametres")}><Settings size={15} /> Paramètres</DropdownMenuItem><DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive"><LogOut size={15} /> Se déconnecter</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
    <SidebarInset className="bg-[#f5f5f2]">
      {isMobile && <div className="mobile-nav"><SidebarTrigger className="h-9 w-9 rounded-lg bg-white" /><span>{activeWorkspace?.name || activeMenuItem.label}</span><PwaControls compact /></div>}
      <main className="min-h-screen">{children}</main>
    </SidebarInset>
  </>;
}
