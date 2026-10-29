import { MIN_HOURS } from "./HorizonChart";

// Method, assumptions and caveats. The first block comes from the API so the
// UI and the analysis code can never disagree about the rules.
export default function Assumptions({ meta }) {
  return (
    <section className="card assumptions">
      <h3>How this was calculated</h3>
      {meta && (
        <ul>
          {meta.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
          <li>
            Data: {meta.forecast_snapshots} forecast publications and {meta.actual_hours} hours of
            actual output, national level, wind only.
          </li>
        </ul>
      )}
      <h3 style={{ marginTop: 16 }}>Limits to keep in mind</h3>
      <ul>
        <li>
          The shortfall buffer is one fixed MW figure measured on January 2026. It is not a
          forecast of future error, and one month is a small sample.
        </li>
        <li>
          The forecasts ran high throughout the month. Differences between how the two datasets
          measure wind output could contribute; that was not investigated in this pilot.
        </li>
        <li>
          Differences between nearby decision times are small and may be noise at this sample size.
        </li>
        <li>
          The forecast-age chart uses every published forecast, not only the one at your decision
          time, and hides age groups with fewer than {MIN_HOURS} hours.
        </li>
      </ul>
    </section>
  );
}
