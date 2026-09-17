import { useEffect, useState } from "react";
import type { StatsSummary } from "@visor3d/shared";
import { getSummary } from "../../api/stats";
import { theme } from "../../styles/theme";
import { StatTile } from "./StatTile";
import { DamagesByTypeChart } from "./DamagesByTypeChart";
import { DamagesBySeverityChart } from "./DamagesBySeverityChart";
import { DamagesOverTimeChart } from "./DamagesOverTimeChart";

interface DashboardPageProps {
  modelId: string;
  modelName: string;
  onBack: () => void;
}

export function DashboardPage({ modelId, modelName, onBack }: DashboardPageProps) {
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSummary(modelId)
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar las estadísticas"));
  }, [modelId]);

  return (
    <div style={{ width: "100vw", height: "100vh", background: theme.color.bg, overflowY: "auto" }}>
      <div
        style={{
          height: 76,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          background: theme.color.panel,
          borderBottom: `1px solid ${theme.color.border}`,
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="/logo.png" alt="Logo" style={{ height: 57, width: "auto" }} />
          <div style={{ width: 1, height: 28, background: theme.color.border }} />
          <span style={{ color: theme.color.textMuted, fontFamily: theme.font, fontSize: 13 }}>{modelName} — Dashboard</span>
        </div>
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: "8px 16px",
            borderRadius: theme.radius,
            border: `1px solid ${theme.color.border}`,
            background: theme.color.panelAlt,
            color: theme.color.text,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: theme.font,
          }}
        >
          ← Volver al visor
        </button>
      </div>

      <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
        {error && <p style={{ color: theme.color.danger, fontFamily: theme.font }}>{error}</p>}

        {summary && (
          <>
            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              <StatTile label="Total de anotaciones" value={summary.totalAnnotations} color={theme.color.accent} />
              <StatTile label="Abiertas" value={summary.byStatus.abierto} color={theme.color.severity.alta} />
              <StatTile label="En revisión" value={summary.byStatus.en_revision} color={theme.color.severity.media} />
              <StatTile label="Resueltas" value={summary.byStatus.resuelto} color={theme.color.severity.baja} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <DamagesByTypeChart byType={summary.byType} />
              <DamagesBySeverityChart bySeverity={summary.bySeverity} />
            </div>

            <DamagesOverTimeChart overTime={summary.overTime} />
          </>
        )}
      </div>
    </div>
  );
}
