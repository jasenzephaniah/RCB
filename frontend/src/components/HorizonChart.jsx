import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { kTick } from "../format";
import ChartTooltip from "./ChartTooltip";
import { axisTick, axisLine, gridProps, lineProps, activeDot, margin, niceAxis } from "./chartKit";

export const MIN_HOURS = 300; // buckets with fewer matched hours are too thin to read

// Error vs how long before the target hour the forecast was published (all forecasts).
export default function HorizonChart({ rows }) {
  const data = rows
    .filter((r) => r.n >= MIN_HOURS)
    .map((r) => ({ ...r, label: `${r.horizon_bucket}–${r.horizon_bucket + 6}h` }));
  const y = niceAxis(data.flatMap((d) => [d.mae, d.bias, d.p90_abs]));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={margin}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" tick={axisTick} axisLine={axisLine} tickLine={false} interval={1} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={kTick} width={40} domain={y.domain} ticks={y.ticks} />
        <Tooltip content={<ChartTooltip title={(l) => `Published ${l} before`} />} cursor={{ stroke: "var(--axis)" }} />
        <Line {...lineProps} name="Typical error (MAE)" dataKey="mae" stroke="var(--s1)" activeDot={{ ...activeDot, fill: "var(--s1)" }} />
        <Line {...lineProps} name="Average over-forecast" dataKey="bias" stroke="var(--s2)" activeDot={{ ...activeDot, fill: "var(--s2)" }} />
        <Line {...lineProps} name="1-in-10 miss (P90)" dataKey="p90_abs" stroke="var(--s3)" activeDot={{ ...activeDot, fill: "var(--s3)" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
