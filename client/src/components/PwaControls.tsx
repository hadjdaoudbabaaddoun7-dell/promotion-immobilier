import { Button } from "@/components/ui/button";
import { useOfflineSync } from "@/contexts/OfflineSyncContext";
import { Cloud, CloudOff, Download, RefreshCw, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

function isIosDevice() { return /iPad|iPhone|iPod/.test(navigator.userAgent); }

export function PwaControls({ compact = false }: { compact?: boolean }) {
  const { status, pendingCount, syncNow } = useOfflineSync();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    const installedHandler = () => { setInstalled(true); setInstallPrompt(null); };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", installedHandler);
    return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", installedHandler); };
  }, []);

  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") toast.success("L’application est en cours d’installation.");
      setInstallPrompt(null);
      return;
    }
    toast.message(isIosDevice() ? "Sur iPhone ou iPad, ouvrez Partager puis sélectionnez « Sur l’écran d’accueil »." : "Utilisez le menu d’installation de votre navigateur pour ajouter l’application.");
  };

  const copy = status === "offline" ? "Hors ligne — enregistré localement" : status === "syncing" ? "Synchronisation des données…" : status === "pending" ? `${pendingCount} modification${pendingCount > 1 ? "s" : ""} à synchroniser` : "En ligne — données synchronisées";
  const StatusIcon = status === "offline" ? CloudOff : status === "syncing" || status === "pending" ? RefreshCw : status === "online" ? Wifi : Cloud;
  if (compact) return <button className={`pwa-status pwa-status-${status}`} onClick={() => void syncNow()} title={copy}><StatusIcon size={14} className={status === "syncing" ? "animate-spin" : ""} /><span className="sr-only">{copy}</span></button>;
  return <div className="pwa-controls"><button className={`pwa-status pwa-status-${status}`} onClick={() => void syncNow()}><StatusIcon size={14} className={status === "syncing" ? "animate-spin" : ""} /><span>{copy}</span></button>{!installed && <Button variant="outline" size="sm" className="install-button" onClick={() => void install()}><Download size={14} /> Installer l’application</Button>}</div>;
}
