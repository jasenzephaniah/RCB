// Card wrapper: title, optional legend, loading/error states, footnote.
// `api` is the result of useApi(); children render only once data is available.
export default function ChartCard({ title, subtitle, legend, api, note, children }) {
  let body;
  if (api && !api.data && api.error) {
    body = (
      <div className="status err" role="alert">
        Could not load this chart ({api.error.message}). Is the API running?
      </div>
    );
  } else if (api && !api.data) {
    body = <div className="status">Loading…</div>;
  } else {
    body = <div className="chart">{children}</div>;
  }

  return (
    <section className="card">
      <h3>{title}</h3>
      {subtitle && <p className="sub">{subtitle}</p>}
      {legend && (
        <ul className="legend" aria-label="Chart legend">
          {legend.map((l) => (
            <li key={l.label}>
              <span className={`swatch${l.box ? " box" : ""}`} style={{ background: l.color }} />
              {l.label}
            </li>
          ))}
        </ul>
      )}
      {body}
      {note && <p className="note">{note}</p>}
    </section>
  );
}
