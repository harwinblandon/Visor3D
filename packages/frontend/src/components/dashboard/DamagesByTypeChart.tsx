import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { StatsSummary } from "@h-geovisor/shared";
import { theme } from "../../styles/theme";
import { ChartTooltip } from "./ChartTooltip";

const LABELS: Record<string, string> = {
  grieta: "Grieta",
  fisura: "Fisura",
  desprendimiento: "Desprend.",
  humedad: "Humedad",
  corrosion: "Corrosión",
  otro: "Otro",
};

interface DamagesByTypeChartProps {
  byType: StatsSummary["byType"];
}

export function DamagesByTypeChart({ byType }: DamagesByTypeChartProps) {
  const data = Object.entries(byType).map(([type, count]) => ({
    type,
    label: LABELS[type] ?? type,
    count,
    color: theme.color.damageType[type as keyof typeof theme.color.damageType] ?? theme.color.accent,
  }));

  return (
    <div style={{ background: theme.color.panel, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius, padding: 16 }}>
      <div style={{ color: theme.color.text, fontSize: 13, fontWeight: 600, marginBottom: 12, fontFamily: theme.font }}>
        Anotaciones por categoría
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={theme.color.chartGrid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: theme.color.textMuted, fontSize: 11, fontFamily: theme.font }}
            axisLine={{ stroke: theme.color.border }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: theme.color.textMuted, fontSize: 11, fontFamily: theme.font }}
            axisLine={{ stroke: theme.color.border }}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: theme.color.panelAlt }} />
          <Bar dataKey="count" name="Anotaciones" radius={[4, 4, 0, 0]} maxBarSize={24}>
            {data.map((d) => (
              <Cell key={d.type} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
