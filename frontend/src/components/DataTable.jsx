// Table view of a chart's data (accessibility + lets the reader check exact values).
export default function DataTable({ label, columns, rows }) {
  return (
    <details className="table-view">
      <summary>{label}</summary>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key}>{c.fmt ? c.fmt(r[c.key]) : r[c.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
