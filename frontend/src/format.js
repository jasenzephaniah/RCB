// Formatting helpers. All times are shown in UK time (Europe/London).
const nf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

export const num = (v) => nf.format(Math.round(v));
export const mw = (v) => (v == null ? "n/a" : `${num(v)} MW`);
export const signedMw = (v) =>
  v == null ? "n/a" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${num(Math.abs(v))} MW`;
export const pct = (v) => `${v.toFixed(1)}%`;

// Axis ticks: 0 / 2.5K / 5K ...
export const kTick = (v) => (Math.abs(v) >= 1000 ? `${v / 1000}K` : `${v}`);

const hm = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const dm = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "short",
});
const long = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "long",
});

export const hhmm = (iso) => hm.format(new Date(iso));
export const dayLabel = (iso) => dm.format(new Date(iso));
export const dayTime = (iso) => `${dayLabel(iso)}, ${hhmm(iso)}`;
export const longDate = (ymd) => long.format(new Date(`${ymd}T12:00:00Z`));
