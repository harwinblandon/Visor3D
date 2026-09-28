import { useEffect, useState } from "react";
import type { Model, Orthophoto } from "@h-geovisor/shared";
import { Viewer3D } from "./viewer/Viewer3D";
import { OrthophotoViewer } from "./viewer2d/OrthophotoViewer";
import { ModelUploadPanel } from "./components/ModelUploadPanel";
import { DashboardPage } from "./components/dashboard/DashboardPage";
import { ModelManager } from "./components/ModelManager";
import { OrthophotoManager } from "./components/OrthophotoManager";
import { OrthophotoUploadPanel } from "./components/OrthophotoUploadPanel";
import { ModelUnavailable } from "./components/ModelUnavailable";
import { getActiveModel, getModel } from "./api/models";
import { getOrthophoto } from "./api/orthophotos";
import { getStoredAdminKey, setStoredAdminKey, verifyAdminKey } from "./api/auth";

type View = "viewer" | "dashboard" | "upload";

const sharedModelId = window.location.pathname.match(/^\/m\/([^/]+)/)?.[1] ?? null;
const sharedOrthophotoId = window.location.pathname.match(/^\/o\/([^/]+)/)?.[1] ?? null;
const ADMIN_IDLE_LOGOUT_MS = 2 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "wheel"] as const;

function App() {
  return sharedOrthophotoId ? <OrthophotoApp orthophotoId={sharedOrthophotoId} /> : <ModelApp />;
}

function OrthophotoApp({ orthophotoId }: { orthophotoId: string }) {
  const [orthophoto, setOrthophoto] = useState<Orthophoto | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(() => !!getStoredAdminKey());
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    getOrthophoto(orthophotoId)
      .then((o) => {
        setOrthophoto(o);
        setNotFound(false);
      })
      .catch(() => {
        setOrthophoto(null);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [orthophotoId, isAdmin]);

  const handleUnlock = async (password: string) => {
    const valid = await verifyAdminKey(password);
    if (valid) {
      setStoredAdminKey(password);
      setIsAdmin(true);
    }
    return valid;
  };

  const handleLock = () => {
    setStoredAdminKey(null);
    setIsAdmin(false);
  };

  if (loading) return null;

  if (notFound || !orthophoto) {
    return (
      <ModelUnavailable
        isAdmin={isAdmin}
        onUnlock={handleUnlock}
        title="Ortofoto no disponible"
        message="Este enlace no existe o la ortofoto no está disponible en este momento. Verifica el enlace o contacta a quien te lo compartió."
      />
    );
  }

  return (
    <>
      <OrthophotoViewer
        orthophoto={orthophoto}
        isAdmin={isAdmin}
        onUnlock={handleUnlock}
        onLock={handleLock}
        onOpenManager={() => setIsManagerOpen(true)}
      />
      {isManagerOpen && (
        <OrthophotoManager
          onClose={() => setIsManagerOpen(false)}
          onUploadNew={() => {
            setIsManagerOpen(false);
            setIsUploadOpen(true);
          }}
          onUpdated={(updated) => {
            setOrthophoto((current) => (current && current.id === updated.id ? updated : current));
          }}
        />
      )}
      {isUploadOpen && (
        <OrthophotoUploadPanel
          onCancel={() => setIsUploadOpen(false)}
          onUploaded={() => {
            setIsUploadOpen(false);
            setIsManagerOpen(true);
          }}
        />
      )}
    </>
  );
}

function ModelApp() {
  const [model, setModel] = useState<Model | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("viewer");
  const [isAdmin, setIsAdmin] = useState(() => !!getStoredAdminKey());
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isOrthophotoManagerOpen, setIsOrthophotoManagerOpen] = useState(false);
  const [isOrthophotoUploadOpen, setIsOrthophotoUploadOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const fetchModel = sharedModelId ? getModel(sharedModelId) : getActiveModel();
    fetchModel
      .then((m) => {
        setModel(m);
        setNotFound(false);
      })
      .catch(() => {
        setModel(null);
        setNotFound(!!sharedModelId);
      })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const handleUnlock = async (password: string) => {
    const valid = await verifyAdminKey(password);
    if (valid) {
      setStoredAdminKey(password);
      setIsAdmin(true);
    }
    return valid;
  };

  const handleLock = () => {
    setStoredAdminKey(null);
    setIsAdmin(false);
  };

  useEffect(() => {
    if (!isAdmin) return;

    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(handleLock, ADMIN_IDLE_LOGOUT_MS);
    };

    resetTimer();
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, resetTimer, { passive: true });

    return () => {
      clearTimeout(timer);
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, resetTimer);
    };
  }, [isAdmin]);

  if (loading) return null;

  if (notFound) {
    return <ModelUnavailable isAdmin={isAdmin} onUnlock={handleUnlock} />;
  }

  if ((!model && !sharedModelId) || view === "upload") {
    return (
      <ModelUploadPanel
        isAdmin={isAdmin}
        onUnlock={handleUnlock}
        onUploaded={(uploaded) => {
          setModel(uploaded);
          setView("viewer");
        }}
        onCancel={model ? () => setView("viewer") : undefined}
      />
    );
  }

  if (!model) return null;

  if (view === "dashboard") {
    return <DashboardPage modelId={model.id} modelName={model.name} onBack={() => setView("viewer")} />;
  }

  return (
    <>
      <Viewer3D
        model={model}
        onOpenDashboard={() => setView("dashboard")}
        onUploadNewModel={() => setView("upload")}
        onOpenManager={() => setIsManagerOpen(true)}
        onOpenOrthophotoManager={() => setIsOrthophotoManagerOpen(true)}
        isAdmin={isAdmin}
        onUnlock={handleUnlock}
        onLock={handleLock}
      />
      {isManagerOpen && (
        <ModelManager
          onClose={() => setIsManagerOpen(false)}
          onUploadNew={() => {
            setIsManagerOpen(false);
            setView("upload");
          }}
          onActivated={(activated) => {
            setModel(activated);
            setIsManagerOpen(false);
          }}
          onUpdated={(updated) => {
            setModel((current) => (current && current.id === updated.id ? updated : current));
          }}
        />
      )}
      {isOrthophotoManagerOpen && (
        <OrthophotoManager
          onClose={() => setIsOrthophotoManagerOpen(false)}
          onUploadNew={() => {
            setIsOrthophotoManagerOpen(false);
            setIsOrthophotoUploadOpen(true);
          }}
          onUpdated={() => {}}
        />
      )}
      {isOrthophotoUploadOpen && (
        <OrthophotoUploadPanel
          onCancel={() => setIsOrthophotoUploadOpen(false)}
          onUploaded={() => {
            setIsOrthophotoUploadOpen(false);
            setIsOrthophotoManagerOpen(true);
          }}
        />
      )}
    </>
  );
}

export default App;
