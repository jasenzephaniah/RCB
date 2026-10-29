import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { num } from "../format";
import { axisTick, axisLine, gridProps, margin } from "./chartKit";

const signed = (v) => (v > 0 ? `+${num(v)}` : v < 0 ? `−${num(Math.abs(v))}` : "0");
const tick = (v) => (v === 0 ? "0" : `${v > 0 ? "+" : "−"}${Math.abs(v) / 1000}K`);

function Tip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const over = d.from_mw >= 0;
  return (
    <div className="tip">
      <div className="tip-title">
        {signed(d.from_mw)} to {signed(d.to_mw)} MW
      </div>
      <div className="tip-row">
        <span className="dot" style={{ background: over ? "var(--s8)" : "var(--s1)" }} />
        <span>{over ? "Forecast too high" : "Forecast too low"}</span>
        <span className="val">{num(d.count)} hours</span>
      </div>
    </div>
  );
}

// Histogram of (forecast - actual). Right of zero = forecast was too high.
export default function ErrorHistogram({ rows }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows} margin={margin} barCategoryGap="12%">
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="from_mw" tickFormatter={tick} tick={axisTick} axisLine={axisLine} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} />
        <Tooltip content={<Tip />} cursor={{ fill: "var(--grid)", opacity: 0.5 }} />
        <Bar dataKey="count" maxBarSize={24} radius={[4, 4, 0, 0]}>
          {rows.map((r) => (
            <Cell key={r.from_mw} fill={r.from_mw >= 0 ? "var(--s8)" : "var(--s1)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
