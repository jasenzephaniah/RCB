import { useEffect, useState } from "react";

// Empty in dev/Docker (same-origin /api via proxy). Set VITE_API_URL on Vercel.
const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export async function getJSON(path, params = {}, signal) {
  const url = new URL(BASE + path, window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });
  const res = await fetch(url, { signal, headers: { accept: "application/json" } });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json()).detail;
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status} ${typeof detail === "string" ? detail : "request failed"}`);
  }
  return res.json();
}

/** Fetch one endpoint; re-fetches when path or params change. */
export function useApi(path, params) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const key = path + JSON.stringify(params || {});

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    getJSON(path, params, ctrl.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (error.name !== "AbortError") setState({ data: null, error, loading: false });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
