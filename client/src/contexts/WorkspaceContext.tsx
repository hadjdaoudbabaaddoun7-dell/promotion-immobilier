import { trpc } from "@/lib/trpc";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { offlineDb, type CachedWorkspace } from "@/lib/offlineDb";

type WorkspaceItem = { id: number; name: string; role: "admin" | "member"; createdByUserId: number; createdAt: Date };
type WorkspaceContextValue = { workspaces: WorkspaceItem[]; activeWorkspace: WorkspaceItem | null; setActiveWorkspaceId: (id: number) => void; loading: boolean };
const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const workspacesQuery = trpc.workspaces.list.useQuery();
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<number | null>(() => Number(localStorage.getItem("active-workspace-id")) || null);
  const [cachedWorkspaces, setCachedWorkspaces] = useState<WorkspaceItem[]>([]);
  useEffect(() => { void offlineDb.workspaces.toArray().then(records => setCachedWorkspaces(records as WorkspaceItem[])); }, []);
  useEffect(() => {
    if (!workspacesQuery.data?.length) return;
    const next = workspacesQuery.data as WorkspaceItem[];
    setCachedWorkspaces(next);
    void offlineDb.transaction("rw", offlineDb.workspaces, async () => { await offlineDb.workspaces.clear(); await offlineDb.workspaces.bulkPut(next as CachedWorkspace[]); });
  }, [workspacesQuery.data]);
  const workspaces = (workspacesQuery.data as WorkspaceItem[] | undefined) ?? cachedWorkspaces;
  useEffect(() => {
    if (workspaces.length && !workspaces.some(workspace => workspace.id === activeWorkspaceId)) setActiveWorkspaceIdState(workspaces[0].id);
  }, [activeWorkspaceId, workspaces]);
  const setActiveWorkspaceId = (id: number) => { localStorage.setItem("active-workspace-id", String(id)); setActiveWorkspaceIdState(id); };
  const value = useMemo(() => ({ workspaces, activeWorkspace: workspaces.find(workspace => workspace.id === activeWorkspaceId) ?? null, setActiveWorkspaceId, loading: workspacesQuery.isLoading && !cachedWorkspaces.length }), [activeWorkspaceId, cachedWorkspaces.length, workspaces, workspacesQuery.isLoading]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return context;
}
