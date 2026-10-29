import { mw } from "../format";

// Generic tooltip: title + one row per series (colour dot, name, value).
export default function ChartTooltip({ active, payload, label, title, fmt = mw }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tip">
      <div className="tip-title">{title ? title(label, payload) : label}</div>
      {payload.map((p) => (
        <div className="tip-row" key={p.dataKey}>
          <span className="dot" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="val">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}
