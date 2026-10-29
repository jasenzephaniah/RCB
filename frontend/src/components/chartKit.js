// Shared chart styling: thin marks, hairline solid grid, recessive axes.
export const axisTick = { fill: "var(--muted)", fontSize: 12 };
export const axisLine = { stroke: "var(--axis)" };
export const gridProps = { vertical: false, stroke: "var(--grid)" };
export const lineProps = { strokeWidth: 2, dot: false, strokeLinejoin: "round", strokeLinecap: "round" };
// Hover dot with a 2px ring in the surface colour so it stays legible over other lines.
export const activeDot = { r: 4, stroke: "var(--surface)", strokeWidth: 2 };
export const margin = { top: 8, right: 20, left: 0, bottom: 0 };

// Round y-axis: picks a step of 1K / 2K / 5K and returns the domain and tick list.
export function niceAxis(values) {
  const nums = values.filter((v) => v != null && Number.isFinite(v));
  const max = Math.max(1, ...nums);
  const min = Math.min(0, ...nums);
  const step = max > 8000 ? 5000 : max > 4000 ? 2000 : 1000;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + 1e-6; v += step) ticks.push(v);
  return { domain: [lo, hi], ticks };
}
