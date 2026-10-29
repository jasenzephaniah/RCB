import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { hhmm, kTick } from "../format";
import ChartTooltip from "./ChartTooltip";
import { axisTick, axisLine, gridProps, lineProps, activeDot, margin, niceAxis } from "./chartKit";

// Forecast at decision time vs what actually happened, plus a conservative line
// (forecast minus the P90 over-forecast buffer, floored at zero).
export default function DecisionChart({ rows, buffer }) {
  const data = rows.map((r) => ({
    t: hhmm(r.time),
    forecast: r.forecast,
    actual: r.actual,
    conservative: Math.max(r.forecast - buffer, 0),
  }));
  const y = niceAxis(data.flatMap((d) => [d.forecast, d.actual, d.conservative]));
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={margin}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="t" tick={axisTick} axisLine={axisLine} tickLine={false} interval={2} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={kTick} width={40} domain={y.domain} ticks={y.ticks} />
        <Tooltip content={<ChartTooltip title={(l) => `${l} UK`} />} cursor={{ stroke: "var(--axis)" }} />
        <Line {...lineProps} name="Forecast" dataKey="forecast" stroke="var(--s1)" activeDot={{ ...activeDot, fill: "var(--s1)" }} />
        <Line {...lineProps} name="Actual wind" dataKey="actual" stroke="var(--s2)" activeDot={{ ...activeDot, fill: "var(--s2)" }} />
        <Line {...lineProps} name="Conservative estimate" dataKey="conservative" stroke="var(--s3)" activeDot={{ ...activeDot, fill: "var(--s3)" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
