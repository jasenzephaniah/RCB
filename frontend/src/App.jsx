import { useMemo, useState } from "react";
import { useApi } from "./api";
import { hhmm, dayTime, longDate, mw, signedMw, num } from "./format";
import Controls from "./components/Controls";
import Kpis from "./components/Kpis";
import ChartCard from "./components/ChartCard";
import DataTable from "./components/DataTable";
import DecisionChart from "./components/DecisionChart";
import MonthChart from "./components/MonthChart";
import HourChart from "./components/HourChart";
import HorizonChart from "./components/HorizonChart";
import CutoffChart from "./components/CutoffChart";
import ErrorHistogram from "./components/ErrorHistogram";
import Assumptions from "./components/Assumptions";

const FIRST_DELIVERY = "2026-01-02";
const LAST_DELIVERY = "2026-02-01";

const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

export default function App() {
  const [cutoff, setCutoff] = useState("09:00");
  const [decisionDate, setDecisionDate] = useState("2026-01-15");
  const [range, setRange] = useState({ from: FIRST_DELIVERY, to: LAST_DELIVERY });

  const meta = useApi("/api/meta");
  const metrics = useApi("/api/metrics", { cutoff });
  const decision = useApi("/api/latest-forecast", { decision_date: decisionDate, cutoff });
  const month = useApi("/api/forecast-vs-actual", { cutoff, from: range.from, to: range.to });
  const byHour = useApi("/api/metrics/by-hour", { cutoff });
  const horizon = useApi("/api/horizon");
  const sensitivity = useApi("/api/cutoff-sensitivity");
  const dist = useApi("/api/error-distribution", { cutoff });

  const buffer = metrics.data?.overforecast_p90_mw ?? 0;

  // Decision chart needs both the day's forecast and the buffer.
  const decisionReady = {
    data: decision.data && metrics.data,
    error: decision.error || metrics.error,
  };

  const decisionRows = useMemo(
    () =>
      (decision.data?.rows ?? []).map((r) => ({
        t: hhmm(r.time),
        forecast: r.forecast,
        actual: r.actual,
        conservative: Math.max(r.forecast - buffer, 0),
      })),
    [decision.data, buffer]
  );

  const dayStats = useMemo(() => {
    const rows = (decision.data?.rows ?? []).filter((r) => r.actual != null);
    if (!rows.length) return null;
    const errs = rows.map((r) => r.forecast - r.actual);
    return { mae: avg(errs.map(Math.abs)), bias: avg(errs) };
  }, [decision.data]);

  return (
    <main className="page">
      <p className="eyebrow">Day-ahead wind forecast pilot · January 2026</p>
      <h1>How much can you trust tomorrow's wind forecast?</h1>
      <p className="lede">
        Elexon's national wind forecasts for Great Britain, compared with what wind farms actually
        delivered, judged at the moment a day-ahead purchase has to be decided.
      </p>

      <Controls
        cutoff={cutoff}
        onCutoff={setCutoff}
        decisionDate={decisionDate}
        onDecisionDate={setDecisionDate}
      />

      {metrics.data ? (
        <Kpis m={metrics.data} />
      ) : (
        <div className={`status${metrics.error ? " err" : ""}`} role={metrics.error ? "alert" : undefined}>
          {metrics.error
            ? `Could not reach the API (${metrics.error.message}). Is the backend running?`
            : "Loading…"}
        </div>
      )}

      <h2 className="section-title">Decision day: what you would have seen</h2>
      <p className="section-lede">
        Choose a decision date above. The chart shows the forecast you would have had at your decision
        time for the next day's delivery, what wind then actually did, and a conservative estimate
        with the shortfall buffer subtracted.
      </p>
      <ChartCard
        api={decisionReady}
        title={decision.data ? `Delivery on ${longDate(decision.data.delivery_date)}` : "Delivery day"}
        subtitle={
          decision.data
            ? `Forecast published ${dayTime(decision.data.forecast_published_at)} UK. Values in MW, hourly.`
            : undefined
        }
        legend={[
          { label: "Forecast", color: "var(--s1)" },
          { label: "Actual wind", color: "var(--s2)" },
          { label: "Conservative estimate (forecast minus buffer)", color: "var(--s3)" },
        ]}
        note={
          dayStats
            ? `That day the forecast was off by ${mw(dayStats.mae)} on average and ${signedMw(
                dayStats.bias
              )} on balance (positive means too high).`
            : undefined
        }
      >
        <DecisionChart rows={decision.data?.rows ?? []} buffer={buffer} />
        <DataTable
          label="Show as table"
          columns={[
            { key: "t", title: "Hour (UK)" },
            { key: "forecast", title: "Forecast", fmt: num },
            { key: "actual", title: "Actual", fmt: (v) => (v == null ? "n/a" : num(v)) },
            { key: "conservative", title: "Conservative", fmt: num },
          ]}
          rows={decisionRows}
        />
      </ChartCard>

      <h2 className="section-title">Whole month: forecast vs actual</h2>
      <p className="section-lede">
        Every delivery day in the range, using the forecast available at your decision time.
      </p>
      <div className="controls" style={{ marginTop: 0 }}>
        <label className="field">
          From
          <input
            type="date"
            value={range.from}
            min={FIRST_DELIVERY}
            max={range.to}
            onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))}
          />
        </label>
        <label className="field">
          To
          <input
            type="date"
            value={range.to}
            min={range.from}
            max={LAST_DELIVERY}
            onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))}
          />
        </label>
      </div>
      <ChartCard
        api={month}
        title="Hourly wind generation, MW"
        legend={[
          { label: "Forecast", color: "var(--s1)" },
          { label: "Actual wind", color: "var(--s2)" },
        ]}
      >
        <MonthChart rows={month.data?.rows ?? []} />
      </ChartCard>

      <h2 className="section-title">Where and when the forecast misses</h2>
      <p className="section-lede">
        Errors are not uniform. They depend on the time of day, on how old the forecast is, and on
        when you decide.
      </p>
      <div className="grid-2">
        <ChartCard
          api={byHour}
          title="Error by hour of day"
          subtitle="Target hour in UK time, at your decision time. MW."
          legend={[
            { label: "Typical error (MAE)", color: "var(--s1)" },
            { label: "Average over-forecast", color: "var(--s2)" },
          ]}
        >
          <HourChart rows={byHour.data ?? []} />
        </ChartCard>
        <ChartCard
          api={horizon}
          title="Error by forecast age"
          subtitle="Hours between publication and the target hour, all forecasts. MW."
          legend={[
            { label: "Typical error (MAE)", color: "var(--s1)" },
            { label: "Average over-forecast", color: "var(--s2)" },
            { label: "1-in-10 miss (P90)", color: "var(--s3)" },
          ]}
          note="Fresher forecasts are noticeably more accurate."
        >
          <HorizonChart rows={horizon.data ?? []} />
        </ChartCard>
      </div>
      <div className="grid-2">
        <ChartCard
          api={sensitivity}
          title="Typical error by decision time"
          subtitle="MAE in MW if the decision is made earlier or later. Same-height bars share one forecast."
          note="Waiting for a later forecast helps only a little."
        >
          <CutoffChart rows={sensitivity.data ?? []} />
        </ChartCard>
        <ChartCard
          api={dist}
          title="How big are the misses?"
          subtitle="Hours by forecast minus actual, MW, at your decision time."
          legend={[
            { label: "Forecast too low", color: "var(--s1)", box: true },
            { label: "Forecast too high", color: "var(--s8)", box: true },
          ]}
          note="Most misses are on the high side, which means less wind than planned for."
        >
          <ErrorHistogram rows={dist.data ?? []} />
        </ChartCard>
      </div>

      <Assumptions meta={meta.data} />

      <p className="footer">
        Contains BMRS data © Elexon Limited copyright and database right 2026. Forecasts: Elexon
        WINDFOR. Actual output: Elexon FUELHH.
      </p>
    </main>
  );
}
