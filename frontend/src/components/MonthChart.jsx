import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { dayLabel, dayTime, kTick } from "../format";
import ChartTooltip from "./ChartTooltip";
import { axisTick, axisLine, gridProps, lineProps, activeDot, margin, niceAxis } from "./chartKit";

// Hourly forecast (as seen at the decision time) vs actual over a date range.
export default function MonthChart({ rows }) {
  const interval = Math.max(0, Math.floor(rows.length / 8) - 1);
  const y = niceAxis(rows.flatMap((d) => [d.forecast, d.actual]));
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={rows} margin={margin}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="time" tickFormatter={dayLabel} tick={axisTick} axisLine={axisLine} tickLine={false} interval={interval} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={kTick} width={40} domain={y.domain} ticks={y.ticks} />
        <Tooltip content={<ChartTooltip title={(l) => `${dayTime(l)} UK`} />} cursor={{ stroke: "var(--axis)" }} />
        <Line {...lineProps} name="Forecast" dataKey="forecast" stroke="var(--s1)" activeDot={{ ...activeDot, fill: "var(--s1)" }} />
        <Line {...lineProps} name="Actual wind" dataKey="actual" stroke="var(--s2)" activeDot={{ ...activeDot, fill: "var(--s2)" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
