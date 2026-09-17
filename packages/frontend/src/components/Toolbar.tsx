import { useState } from "react";
import { useViewerStore, type ActiveTool } from "../state/viewerStore";
import { finalizeAreaPolygon } from "../viewer/interactions/MeasureAreaTool";
import { finalizePolyline } from "../viewer/interactions/PolylineTool";
import { exportUrl, exportAnnotationsUrl } from "../api/models";
import { Dropdown, DropdownItem, DropdownLinkItem, DropdownDivider } from "./Dropdown";
import { theme } from "../styles/theme";

const TOOL_LABELS: Record<ActiveTool, string> = {
  none: "Ninguna",
  "measure-distance": "Medir distancia",
  "measure-area": "Medir área",
  "vectorize-polyline": "Polilínea",
  annotate: "Anotar daño",
};

const TOOL_COLORS: Partial<Record<ActiveTool, string>> = {
  "measure-distance": theme.color.distance,
  "measure-area": theme.color.area,
  "vectorize-polyline": theme.color.polyline,
  annotate: theme.color.severity.alta,
};

function FinishButton({ color, onClick, children }: { color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: theme.radius,
        border: `1px solid ${color}`,
        background: color,
        color: "#0b0d10",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: theme.font,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

interface ToolbarProps {
  modelName: string;
  onOpenDashboard: () => void;
  onUploadNewModel: () => void;
  hasLocation: boolean;
  onToggleLocation: () => void;
  isAdmin: boolean;
  onUnlock: (password: string) => Promise<boolean>;
  onLock: () => void;
}

function AdminUnlockMenu({ onUnlock }: { onUnlock: (password: string) => Promise<boolean> }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleSubmit = async () => {
    if (!password) return;
    setChecking(true);
    setError(null);
    const ok = await onUnlock(password);
    setChecking(false);
    if (!ok) setError("Clave incorrecta");
    else setPassword("");
  };

  return (
    <Dropdown label="🔒">
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, width: 220 }}
      >
        <span style={{ color: theme.color.textMuted, fontSize: 12 }}>Acceso de administrador</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Clave"
          style={{
            padding: "8px 10px",
            borderRadius: theme.radius,
            border: `1px solid ${theme.color.border}`,
            background: theme.color.panelAlt,
            color: theme.color.text,
            fontFamily: theme.font,
            fontSize: 13,
            outline: "none",
          }}
        />
        {error && <span style={{ color: theme.color.danger, fontSize: 11 }}>{error}</span>}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!password || checking}
          style={{
            padding: "7px 10px",
            borderRadius: theme.radius,
            border: "none",
            background: theme.color.accent,
            color: "#0b0d10",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: theme.font,
          }}
        >
          {checking ? "Verificando..." : "Desbloquear"}
        </button>
      </div>
    </Dropdown>
  );
}

export function Toolbar({
  modelName,
  onOpenDashboard,
  onUploadNewModel,
  hasLocation,
  onToggleLocation,
  isAdmin,
  onUnlock,
  onLock,
}: ToolbarProps) {
  const activeTool = useViewerStore((s) => s.activeTool);
  const setActiveTool = useViewerStore((s) => s.setActiveTool);
  const pendingPoints = useViewerStore((s) => s.pendingPoints);
  const modelId = useViewerStore((s) => s.modelId);

  const isMeasuringArea = activeTool === "measure-area";
  const isVectorizing = activeTool === "vectorize-polyline";
  const activeToolColor = activeTool !== "none" ? TOOL_COLORS[activeTool] : undefined;

  const toolStatus =
    activeTool === "measure-distance" && pendingPoints.length === 1
      ? "clic en el 2° punto"
      : activeTool === "measure-area"
        ? `${pendingPoints.length} pto(s)`
        : activeTool === "vectorize-polyline"
          ? `${pendingPoints.length} pto(s)`
          : activeTool !== "none"
            ? TOOL_LABELS[activeTool]
            : null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 76,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        background: theme.color.panel,
        borderBottom: `1px solid ${theme.color.border}`,
        zIndex: 20,
        boxSizing: "border-box",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <img src="/logo.png" alt="Logo" style={{ height: 57, width: "auto", display: "block" }} />
        <div style={{ width: 1, height: 28, background: theme.color.border }} />
        <span style={{ color: theme.color.textMuted, fontFamily: theme.font, fontSize: 13 }}>{modelName}</span>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Dropdown
          accentColor={activeToolColor}
          label={
            <>
              {activeTool !== "none" && (
                <span
                  style={{ width: 8, height: 8, borderRadius: "50%", background: activeToolColor, display: "inline-block" }}
                />
              )}
              Herramientas{toolStatus ? `: ${toolStatus}` : ""}
            </>
          }
        >
          {(Object.keys(TOOL_LABELS) as ActiveTool[])
            .filter((t) => t !== "none")
            .map((t) => (
              <DropdownItem
                key={t}
                active={activeTool === t}
                color={TOOL_COLORS[t]}
                onClick={() => setActiveTool(activeTool === t ? "none" : t)}
              >
                {TOOL_LABELS[t]}
              </DropdownItem>
            ))}
          <DropdownDivider />
          <DropdownItem active={activeTool === "none"} onClick={() => setActiveTool("none")}>
            Ninguna herramienta
          </DropdownItem>
        </Dropdown>

        {isMeasuringArea && pendingPoints.length >= 3 && (
          <FinishButton color={theme.color.area} onClick={() => finalizeAreaPolygon()}>
            Cerrar polígono
          </FinishButton>
        )}
        {isVectorizing && pendingPoints.length >= 2 && (
          <FinishButton color={theme.color.polyline} onClick={() => finalizePolyline()}>
            Finalizar polilínea
          </FinishButton>
        )}

        <Dropdown label="Ver">
          {hasLocation && (
            <DropdownItem onClick={onToggleLocation}>Ubicación</DropdownItem>
          )}
          <DropdownItem onClick={onOpenDashboard}>Dashboard</DropdownItem>
        </Dropdown>

        {modelId && (
          <Dropdown label="Exportar">
            <DropdownLinkItem href={exportUrl(modelId, "dxf")}>Modelo vectorial — DXF</DropdownLinkItem>
            <DropdownLinkItem href={exportUrl(modelId, "geojson")}>Modelo vectorial — GeoJSON</DropdownLinkItem>
            <DropdownDivider />
            <DropdownLinkItem href={exportAnnotationsUrl(modelId)}>Inventario de daños — CSV</DropdownLinkItem>
          </Dropdown>
        )}

        {isAdmin ? (
          <Dropdown label="Modelo">
            <DropdownItem onClick={onUploadNewModel}>Subir nuevo modelo</DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={onLock}>Cerrar sesión de administrador</DropdownItem>
          </Dropdown>
        ) : (
          <AdminUnlockMenu onUnlock={onUnlock} />
        )}
      </div>
    </div>
  );
}
