import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { kTick, mw, signedMw } from "../format";
import { axisTick, axisLine, gridProps, margin, niceAxis } from "./chartKit";

function Tip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="tip">
      <div className="tip-title">Decide at {d.cutoff} UK</div>
      <div className="tip-row"><span>Typical error</span><span className="val">{mw(d.mae_mw)}</span></div>
      <div className="tip-row"><span>Average over-forecast</span><span className="val">{signedMw(d.bias_mw)}</span></div>
      <div className="tip-row"><span>1-in-10 miss (P90)</span><span className="val">{mw(d.abs_error_p90_mw)}</span></div>
    </div>
  );
}

// Typical error if the buyer decides earlier or later in the morning.
export default function CutoffChart({ rows }) {
  const y = niceAxis(rows.map((d) => d.mae_mw));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows} margin={margin} barCategoryGap="20%">
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="cutoff" tick={axisTick} axisLine={axisLine} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={kTick} width={40} domain={y.domain} ticks={y.ticks} />
        <Tooltip content={<Tip />} cursor={{ fill: "var(--grid)", opacity: 0.5 }} />
        <Bar dataKey="mae_mw" name="Typical error (MAE)" fill="var(--s1)" maxBarSize={24} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
