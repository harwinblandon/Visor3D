import { theme } from "../../styles/theme";

interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: { name: string; value: number; color?: string }[];
}

export function ChartTooltip({ active, label, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      style={{
        background: theme.color.panelAlt,
        border: `1px solid ${theme.color.border}`,
        borderRadius: 6,
        padding: "8px 12px",
        fontFamily: theme.font,
        fontSize: 12,
      }}
    >
      {label && <div style={{ color: theme.color.textMuted, marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, color: theme.color.text }}>
          <span
            style={{ width: 8, height: 8, borderRadius: "50%", background: p.color ?? theme.color.accent, display: "inline-block" }}
          />
          <span>
            {p.name}: <strong>{p.value}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}
