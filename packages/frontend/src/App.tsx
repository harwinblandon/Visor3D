import { useEffect, useState } from "react";
import type { Model } from "@visor3d/shared";
import { Viewer3D } from "./viewer/Viewer3D";
import { ModelUploadPanel } from "./components/ModelUploadPanel";
import { DashboardPage } from "./components/dashboard/DashboardPage";
import { getActiveModel } from "./api/models";
import { getStoredAdminKey, setStoredAdminKey, verifyAdminKey } from "./api/auth";

type View = "viewer" | "dashboard" | "upload";

function App() {
  const [model, setModel] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("viewer");
  const [isAdmin, setIsAdmin] = useState(() => !!getStoredAdminKey());

  useEffect(() => {
    getActiveModel()
      .then(setModel)
      .catch(() => setModel(null))
      .finally(() => setLoading(false));
  }, []);

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

  if (!model || view === "upload") {
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

  if (view === "dashboard") {
    return <DashboardPage modelId={model.id} modelName={model.name} onBack={() => setView("viewer")} />;
  }

  return (
    <Viewer3D
      model={model}
      onOpenDashboard={() => setView("dashboard")}
      onUploadNewModel={() => setView("upload")}
      isAdmin={isAdmin}
      onUnlock={handleUnlock}
      onLock={handleLock}
    />
  );
}

export default App;
