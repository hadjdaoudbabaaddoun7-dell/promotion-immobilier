import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import { OfflineSyncProvider } from "@/contexts/OfflineSyncContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import NotFound from "@/pages/NotFound";
import IntakeDetailPage from "@/pages/IntakeDetailPage";
import IntakeFormPage from "@/pages/IntakeFormPage";
import PrintPage from "@/pages/PrintPage";
import SharedIntakeEditPage from "@/pages/SharedIntakeEditPage";
import SharedIntakePage from "@/pages/SharedIntakePage";
import SharedPrintPage from "@/pages/SharedPrintPage";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import { ArchivePage, TrashPage } from "./pages/Home";
import MembersPage from "./pages/MembersPage";
import SettingsPage from "./pages/SettingsPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) { return <WorkspaceProvider><OfflineSyncProvider><DashboardLayout>{children}</DashboardLayout></OfflineSyncProvider></WorkspaceProvider>; }

function Router() { return <Switch><Route path="/"><ProtectedRoute><Home /></ProtectedRoute></Route><Route path="/nouvelle-fiche"><ProtectedRoute><IntakeFormPage /></ProtectedRoute></Route><Route path="/archives"><ProtectedRoute><ArchivePage /></ProtectedRoute></Route><Route path="/corbeille"><ProtectedRoute><TrashPage /></ProtectedRoute></Route><Route path="/membres"><ProtectedRoute><MembersPage /></ProtectedRoute></Route><Route path="/parametres"><ProtectedRoute><SettingsPage /></ProtectedRoute></Route><Route path="/partage/:token/imprimer" component={SharedPrintPage} /><Route path="/partage/:token/modifier" component={SharedIntakeEditPage} /><Route path="/partage/:token" component={SharedIntakePage} /><Route path="/fiches/:id/imprimer" component={PrintPage} /><Route path="/fiches/:id/modifier"><ProtectedRoute><IntakeFormPage /></ProtectedRoute></Route><Route path="/fiches/:id"><ProtectedRoute><IntakeDetailPage /></ProtectedRoute></Route><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>; }

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors position="top-right" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
