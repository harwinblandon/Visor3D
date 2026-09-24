import { useOrthophotoStore, type ActiveTool2D, type BasemapId } from "../state/orthophotoStore";
import { finalizeAreaPolygon } from "./interactions/MeasureAreaTool";
import { finalizePolyline } from "./interactions/PolylineTool";
import { Dropdown, DropdownItem, DropdownDivider } from "../components/Dropdown";
import { AdminUnlockMenu } from "../components/Toolbar";
import { useIsMobile } from "../hooks/useIsMobile";
import { theme } from "../styles/theme";

const TOOL_LABELS: Record<ActiveTool2D, string> = {
  none: "Ninguna",
  "measure-distance": "Medir distancia",
  "measure-area": "Medir área",
  "vectorize-polyline": "Polilínea",
  "measure-circle": "Círculo (centro + radio)",
  annotate: "Anotar",
};

const TOOL_COLORS: Partial<Record<ActiveTool2D, string>> = {
  "measure-distance": theme.color.distance,
  "measure-area": theme.color.area,
  "vectorize-polyline": theme.color.polyline,
  "measure-circle": theme.color.circle,
  annotate: theme.color.severity.alta,
};

const BASEMAP_LABELS: Record<BasemapId, string> = {
  none: "Ninguno",
  satellite: "Satelital",
  hybrid: "Híbrido",
};

function FinishButton({ color, onClick, compact, children }: { color: string; onClick: () => void; compact?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: compact ? "8px 10px" : "8px 16px",
        borderRadius: theme.radius,
        border: `1px solid ${color}`,
        background: color,
        color: "#0b0d10",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: theme.font,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

interface OrthophotoToolbarProps {
  isAdmin: boolean;
  onUnlock: (password: string) => Promise<boolean>;
  onLock: () => void;
  onOpenManager: () => void;
  onOpenLayers: () => void;
  onOpenTerrain: () => void;
}

export function OrthophotoToolbar({ isAdmin, onUnlock, onLock, onOpenManager, onOpenLayers, onOpenTerrain }: OrthophotoToolbarProps) {
  const activeTool = useOrthophotoStore((s) => s.activeTool);
  const setActiveTool = useOrthophotoStore((s) => s.setActiveTool);
  const pendingPoints = useOrthophotoStore((s) => s.pendingPoints);
  const editingMeasurement = useOrthophotoStore((s) => s.editingMeasurement);
  const removeLastPendingPoint = useOrthophotoStore((s) => s.removeLastPendingPoint);
  const basemap = useOrthophotoStore((s) => s.basemap);
  const setBasemap = useOrthophotoStore((s) => s.setBasemap);
  const isMobile = useIsMobile();

  const isMeasuringArea = activeTool === "measure-area";
  const isVectorizing = activeTool === "vectorize-polyline";
  const isMeasuringDistance = activeTool === "measure-distance";
  const isMeasuringCircle = activeTool === "measure-circle";
  const activeToolColor = activeTool !== "none" ? TOOL_COLORS[activeTool] : undefined;
  const canUndoPoint = (isMeasuringDistance || isMeasuringArea || isVectorizing || isMeasuringCircle) && pendingPoints.length > 0;

  const toolStatus =
    (activeTool === "measure-distance" || activeTool === "measure-circle") && pendingPoints.length === 1
      ? activeTool === "measure-circle"
        ? "clic para definir el radio"
        : "clic en el 2° punto"
      : activeTool === "measure-area"
        ? `${pendingPoints.length} pto(s)`
        : activeTool === "vectorize-polyline"
          ? `${pendingPoints.length} pto(s)`
          : activeTool !== "none"
            ? TOOL_LABELS[activeTool]
            : null;

  return (
    <div style={{ display: "flex", gap: isMobile ? 6 : 8, alignItems: "center", flexShrink: 0 }}>
      {editingMeasurement ? (
        <div
          style={{
            padding: isMobile ? "6px 10px" : "8px 16px",
            borderRadius: theme.radius,
            border: `1px solid ${theme.color.accent}`,
            color: theme.color.accent,
            fontSize: isMobile ? 11 : 13,
            fontWeight: 600,
            fontFamily: theme.font,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: isMobile ? 150 : undefined,
          }}
        >
          {isMobile ? "Editando…" : "Editando vértices — guarda o cancela en la lista de mediciones"}
        </div>
      ) : (
        <>
          <Dropdown
            accentColor={activeToolColor}
            label={
              <>
                {activeTool !== "none" && (
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: activeToolColor, display: "inline-block" }} />
                )}
                {isMobile ? "Herr." : "Herramientas"}
                {toolStatus ? `: ${toolStatus}` : ""}
              </>
            }
          >
            {(Object.keys(TOOL_LABELS) as ActiveTool2D[])
              .filter((t) => t !== "none")
              .map((t) => (
                <DropdownItem key={t} active={activeTool === t} color={TOOL_COLORS[t]} onClick={() => setActiveTool(activeTool === t ? "none" : t)}>
                  {TOOL_LABELS[t]}
                </DropdownItem>
              ))}
            <DropdownItem active={activeTool === "none"} onClick={() => setActiveTool("none")}>
              Ninguna herramienta
            </DropdownItem>
          </Dropdown>

          {canUndoPoint && (
            <FinishButton color={theme.color.textMuted} onClick={() => removeLastPendingPoint()} compact={isMobile}>
              {isMobile ? "↩" : "↩ Deshacer último punto"}
            </FinishButton>
          )}

          {isMeasuringArea && pendingPoints.length >= 3 && (
            <FinishButton color={theme.color.area} onClick={() => finalizeAreaPolygon()} compact={isMobile}>
              {isMobile ? "✓ Cerrar" : "Cerrar polígono"}
            </FinishButton>
          )}
          {isVectorizing && pendingPoints.length >= 2 && (
            <FinishButton color={theme.color.polyline} onClick={() => finalizePolyline()} compact={isMobile}>
              {isMobile ? "✓ Terminar" : "Finalizar polilínea"}
            </FinishButton>
          )}
        </>
      )}

      <Dropdown label={isMobile ? "🗺" : `Mapa base: ${BASEMAP_LABELS[basemap]}`}>
        {(Object.keys(BASEMAP_LABELS) as BasemapId[]).map((b) => (
          <DropdownItem key={b} active={basemap === b} onClick={() => setBasemap(b)}>
            {BASEMAP_LABELS[b]}
          </DropdownItem>
        ))}
      </Dropdown>

      {isAdmin ? (
        <Dropdown label={isMobile ? "⋮" : "Ortofoto"}>
          <DropdownItem onClick={onOpenLayers}>Capas KML/KMZ</DropdownItem>
          <DropdownItem onClick={onOpenTerrain}>Terreno 3D</DropdownItem>
          <DropdownItem onClick={onOpenManager}>Gestionar ortofotos</DropdownItem>
          <DropdownDivider />
          <DropdownItem onClick={onLock}>Cerrar sesión de administrador</DropdownItem>
        </Dropdown>
      ) : (
        <AdminUnlockMenu onUnlock={onUnlock} />
      )}
    </div>
  );
}
