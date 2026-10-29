import { num, mw, signedMw, pct } from "../format";

// One hero figure (the buffer) plus four supporting stat tiles.
export default function Kpis({ m }) {
  const biasPct = (m.bias_mw / m.mean_actual_mw) * 100;
  return (
    <>
      <div className="hero">
        <p className="hero-label">Wind shortfall to plan for (90% confidence)</p>
        <p className="hero-value">
          {num(m.overforecast_p90_mw)}
          <span className="hero-unit">MW</span>
        </p>
        <p className="hero-sub">
          In 9 out of 10 January hours, actual wind came in less than this far below the forecast.
          Use it as the buffer when buying day-ahead power.
        </p>
      </div>
      <div className="tiles">
        <div className="tile">
          <p className="tile-label">Average over-forecast</p>
          <p className="tile-value">{signedMw(m.bias_mw)}</p>
          <p className="tile-sub">
            Forecasts ran high by {pct(Math.abs(biasPct))} of average wind output
          </p>
        </div>
        <div className="tile">
          <p className="tile-label">Typical error</p>
          <p className="tile-value">{mw(m.mae_mw)}</p>
          <p className="tile-sub">{pct(m.mae_pct_of_mean_actual)} of average wind output</p>
        </div>
        <div className="tile">
          <p className="tile-label">Worst 1-in-100 miss</p>
          <p className="tile-value">{mw(m.abs_error_p99_mw)}</p>
          <p className="tile-sub">99% of hours were closer than this</p>
        </div>
        <div className="tile">
          <p className="tile-label">Hours analysed</p>
          <p className="tile-value">{num(m.n_hours)}</p>
          <p className="tile-sub">{Math.round(m.n_hours / 24)} delivery days, 2 Jan to 1 Feb</p>
        </div>
      </div>
    </>
  );
}
