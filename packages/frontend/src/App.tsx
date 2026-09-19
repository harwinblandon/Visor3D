import { useEffect, useState } from "react";
import type { Model } from "@visor3d/shared";
import { Viewer3D } from "./viewer/Viewer3D";
import { ModelUploadPanel } from "./components/ModelUploadPanel";
import { DashboardPage } from "./components/dashboard/DashboardPage";
import { ModelManager } from "./components/ModelManager";
import { ModelUnavailable } from "./components/ModelUnavailable";
import { getActiveModel, getModel } from "./api/models";
import { getStoredAdminKey, setStoredAdminKey, verifyAdminKey } from "./api/auth";

type View = "viewer" | "dashboard" | "upload";

const sharedModelId = window.location.pathname.match(/^\/m\/([^/]+)/)?.[1] ?? null;

function App() {
  const [model, setModel] = useState<Model | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("viewer");
  const [isAdmin, setIsAdmin] = useState(() => !!getStoredAdminKey());
  const [isManagerOpen, setIsManagerOpen] = useState(false);

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
        />
      )}
    </>
  );
}

export default App;
