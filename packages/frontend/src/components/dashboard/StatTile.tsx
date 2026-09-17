import { theme } from "../../styles/theme";

interface StatTileProps {
  label: string;
  value: number;
  color?: string;
}

export function StatTile({ label, value, color }: StatTileProps) {
  return (
    <div
      style={{
        flex: 1,
        background: theme.color.panel,
        border: `1px solid ${theme.color.border}`,
        borderRadius: theme.radius,
        padding: "16px 20px",
      }}
    >
      <div style={{ color: theme.color.textMuted, fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ color: color ?? theme.color.text, fontSize: 28, fontWeight: 600, fontFamily: theme.font }}>
        {value}
      </div>
    </div>
  );
}
