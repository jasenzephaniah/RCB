const CUTOFFS = Array.from({ length: 9 }, (_, i) => `${String(i + 4).padStart(2, "0")}:00`);

export default function Controls({ cutoff, onCutoff, decisionDate, onDecisionDate }) {
  return (
    <div className="controls">
      <label className="field">
        Decision time (UK, day before delivery)
        <select value={cutoff} onChange={(e) => onCutoff(e.target.value)}>
          {CUTOFFS.map((c) => (
            <option key={c} value={c}>
              {c}
              {c === "09:00" ? " (default)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Decision date
        <input
          type="date"
          value={decisionDate}
          min="2026-01-01"
          max="2026-01-31"
          onChange={(e) => e.target.value && onDecisionDate(e.target.value)}
        />
      </label>
      <p className="hint">
        The forecast used is the latest one published before the decision time. Forecasts are issued
        every 2 to 4 hours, so nearby decision times can share the same forecast.
      </p>
    </div>
  );
}
