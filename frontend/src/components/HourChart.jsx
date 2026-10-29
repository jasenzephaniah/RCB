import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { kTick } from "../format";
import ChartTooltip from "./ChartTooltip";
import { axisTick, axisLine, gridProps, lineProps, activeDot, margin, niceAxis } from "./chartKit";

const hourLabel = (h) => `${String(h).padStart(2, "0")}:00`;

// Error by hour of day (UK time) at the chosen decision time.
export default function HourChart({ rows }) {
  const y = niceAxis(rows.flatMap((d) => [d.mae, d.bias]));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={rows} margin={margin}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="hour_uk" tickFormatter={hourLabel} tick={axisTick} axisLine={axisLine} tickLine={false} interval={2} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={kTick} width={40} domain={y.domain} ticks={y.ticks} />
        <ReferenceLine y={0} stroke="var(--axis)" />
        <Tooltip content={<ChartTooltip title={(l) => `${hourLabel(l)} UK`} />} cursor={{ stroke: "var(--axis)" }} />
        <Line {...lineProps} name="Typical error (MAE)" dataKey="mae" stroke="var(--s1)" activeDot={{ ...activeDot, fill: "var(--s1)" }} />
        <Line {...lineProps} name="Average over-forecast" dataKey="bias" stroke="var(--s2)" activeDot={{ ...activeDot, fill: "var(--s2)" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
