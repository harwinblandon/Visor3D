import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getPageViewsSummary, type PageViewsSummary } from "../api/pageViews";
import { ChartTooltip } from "./dashboard/ChartTooltip";
import { theme } from "../styles/theme";

interface UsagePanelProps {
  onClose: () => void;
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return "—";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua) && !/Chrome/.test(ua)
          ? "Safari"
          : "Otro";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Otro";
  return `${browser} · ${os}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ flex: 1, padding: "14px 16px", borderRadius: theme.radius, background: theme.color.panelAlt, border: `1px solid ${theme.color.border}` }}>
      <div style={{ color: theme.color.text, fontSize: 24, fontWeight: 700 }}>{value.toLocaleString("es-CO")}</div>
      <div style={{ color: theme.color.textMuted, fontSize: 11, marginTop: 2 }}>{label}</div>
    </div>
  );
}

export function UsagePanel({ onClose }: UsagePanelProps) {
  const [summary, setSummary] = useState<PageViewsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPageViewsSummary()
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar las visitas"));
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 40,
        fontFamily: theme.font,
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          padding: 24,
          borderRadius: 12,
          background: theme.color.panel,
          border: `1px solid ${theme.color.border}`,
          width: "min(820px, 100%)",
          maxHeight: "85vh",
          boxSizing: "border-box",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: theme.color.text, margin: 0, fontSize: 15, fontWeight: 600 }}>Visitas</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "transparent", color: theme.color.textMuted, cursor: "pointer", fontSize: 18 }}
          >
            ×
          </button>
        </div>

        {error && <p style={{ color: theme.color.danger, fontSize: 12, margin: 0 }}>{error}</p>}
        {!summary && !error && <p style={{ color: theme.color.textMuted, fontSize: 13 }}>Cargando...</p>}

        {summary && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
            <div style={{ display: "flex", gap: 10 }}>
              <StatTile label="Visitas totales" value={summary.totalViews} />
              <StatTile label="IPs únicas" value={summary.uniqueIps} />
              <StatTile label="Visitas hoy" value={summary.viewsToday} />
            </div>

            <div style={{ background: theme.color.panelAlt, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius, padding: 16 }}>
              <div style={{ color: theme.color.text, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Visitas por día (últimos 30 días)</div>
              {summary.byDay.length === 0 ? (
                <div style={{ color: theme.color.textMuted, fontSize: 12, padding: "30px 0", textAlign: "center" }}>
                  Todavía no hay visitas registradas.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={summary.byDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={theme.color.chartGrid} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: theme.color.textMuted, fontSize: 10, fontFamily: theme.font }} axisLine={{ stroke: theme.color.border }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: theme.color.textMuted, fontSize: 11, fontFamily: theme.font }} axisLine={{ stroke: theme.color.border }} tickLine={false} width={28} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: theme.color.border }} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Visitas"
                      stroke={theme.color.accent}
                      strokeWidth={2}
                      fill={theme.color.accent}
                      fillOpacity={0.1}
                      dot={{ r: 3, fill: theme.color.accent, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: theme.color.accent, stroke: theme.color.panel, strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{ background: theme.color.panelAlt, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius, padding: 16 }}>
              <div style={{ color: theme.color.text, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Más visitados</div>
              {summary.bySubject.length === 0 ? (
                <div style={{ color: theme.color.textMuted, fontSize: 12 }}>Sin datos todavía.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {summary.bySubject.map((s) => (
                    <div key={`${s.subjectType}-${s.subjectId}`} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: theme.color.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.name}
                        <span style={{ color: theme.color.textMuted }}> ({s.subjectType === "model" ? "modelo" : "ortofoto"})</span>
                      </span>
                      <span style={{ color: theme.color.accent, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: theme.color.panelAlt, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius, padding: 16 }}>
              <div style={{ color: theme.color.text, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Actividad reciente</div>
              {summary.recent.length === 0 ? (
                <div style={{ color: theme.color.textMuted, fontSize: 12 }}>Sin datos todavía.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0, maxHeight: 260, overflowY: "auto" }}>
                  {summary.recent.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        fontSize: 11,
                        padding: "6px 0",
                        borderBottom: `1px solid ${theme.color.border}`,
                      }}
                    >
                      <span style={{ color: theme.color.textMuted, flexShrink: 0, width: 95 }}>{formatDateTime(r.viewedAt)}</span>
                      <span style={{ color: theme.color.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                      <span style={{ color: theme.color.textMuted, flexShrink: 0 }}>{r.ipAddress ?? "—"}</span>
                      <span style={{ color: theme.color.textMuted, flexShrink: 0, width: 90, textAlign: "right" }}>{parseUserAgent(r.userAgent)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
