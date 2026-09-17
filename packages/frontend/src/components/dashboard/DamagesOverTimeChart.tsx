import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { StatsSummary } from "@visor3d/shared";
import { theme } from "../../styles/theme";
import { ChartTooltip } from "./ChartTooltip";

interface DamagesOverTimeChartProps {
  overTime: StatsSummary["overTime"];
}

export function DamagesOverTimeChart({ overTime }: DamagesOverTimeChartProps) {
  const data = overTime.map((d) => ({ month: d.month, count: d.count }));

  return (
    <div style={{ background: theme.color.panel, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius, padding: 16 }}>
      <div style={{ color: theme.color.text, fontSize: 13, fontWeight: 600, marginBottom: 12, fontFamily: theme.font }}>
        Anotaciones a lo largo del tiempo
      </div>
      {data.length === 0 ? (
        <div style={{ color: theme.color.textMuted, fontSize: 12, padding: "40px 0", textAlign: "center" }}>
          Todavía no hay suficientes datos.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={theme.color.chartGrid} vertical={false} />
            <XAxis
              dataKey="month"
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
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: theme.color.border }} />
            <Area
              type="monotone"
              dataKey="count"
              name="Anotaciones"
              stroke={theme.color.accent}
              strokeWidth={2}
              fill={theme.color.accent}
              fillOpacity={0.1}
              dot={{ r: 4, fill: theme.color.accent, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: theme.color.accent, stroke: theme.color.panel, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
