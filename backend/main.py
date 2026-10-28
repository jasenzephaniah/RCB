import re
from datetime import date
from functools import lru_cache

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

import analysis

app = FastAPI(title="Wind forecast accuracy API", version="1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"]
)

ACTUALS = analysis.load_actuals_hourly()
FCST = analysis.load_forecasts()

DEFAULT_CUTOFF = "09:00"
CUTOFF_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
DECISION_START, DECISION_END = date(2026, 1, 1), date(2026, 1, 31)


# ---------------------------------------------------------------- helpers
def check_cutoff(cutoff: str) -> str:
    if not CUTOFF_RE.match(cutoff):
        raise HTTPException(400, "cutoff must be HH:MM (24h, UK time), e.g. 09:00")
    return cutoff


@lru_cache(maxsize=64)
def evaluated(cutoff: str) -> pd.DataFrame:
    return analysis.evaluate(analysis.select_forecasts(FCST, cutoff=cutoff), ACTUALS)


def iso(series: pd.Series) -> pd.Series:
    return series.dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def records(df: pd.DataFrame) -> list:
    """DataFrame -> JSON-safe list of dicts (NaN becomes null)."""
    out = df.astype(object).where(df.notna(), None)
    return out.to_dict(orient="records")


# -------------------------------------------------------------- endpoints
@app.get("/api/meta")
def meta():
    """Assumptions and data coverage, so the UI can state them clearly."""
    return {
        "default_cutoff_uk": DEFAULT_CUTOFF,
        "decision_dates": [DECISION_START.isoformat(), DECISION_END.isoformat()],
        "delivery_dates": ["2026-01-02", "2026-02-01"],
        "assumptions": [
            "Decision for delivery day D is made on D-1 at the cutoff (UK time).",
            "The forecast used is the latest WINDFOR snapshot published at or before the cutoff.",
            "Forecasts are hourly; actual (FUELHH) half-hours are averaged into hourly values.",
            "Error = forecast - actual. Positive means the forecast was too high.",
        ],
        "forecast_snapshots": int(FCST["publishTime"].nunique()),
        "actual_hours": int(len(ACTUALS)),
    }


@app.get("/api/forecast-vs-actual")
def forecast_vs_actual(
    cutoff: str = DEFAULT_CUTOFF,
    date_from: date = Query(date(2026, 1, 2), alias="from"),
    date_to: date = Query(date(2026, 2, 1), alias="to"),
):
    """Hourly forecast (as seen at the cutoff) vs actual, by delivery date."""
    df = evaluated(check_cutoff(cutoff))
    df = df[(df["delivery_date"] >= date_from) & (df["delivery_date"] <= date_to)]
    out = pd.DataFrame({
        "time": iso(df["startTime"]),
        "forecast": df["forecast"],
        "actual": df["actual"].round(0),
        "error": df["error"].round(0),
        "publish_time": iso(df["publishTime"]),
        "horizon_h": df["horizon_h"],
    })
    return {"cutoff": cutoff, "rows": records(out)}


@app.get("/api/latest-forecast")
def latest_forecast(
    decision_date: date = Query(..., description="Day the buyer decides (Jan 2026)"),
    cutoff: str = DEFAULT_CUTOFF,
):
    """The forecast the buyer would have had in hand on a given decision day."""
    if not DECISION_START <= decision_date <= DECISION_END:
        raise HTTPException(400, "decision_date must be within 2026-01-01..2026-01-31")
    sel = analysis.select_forecasts(
        FCST, decision_start=decision_date, decision_end=decision_date,
        cutoff=check_cutoff(cutoff),
    )
    sel = sel.merge(ACTUALS, on="startTime", how="left")
    out = pd.DataFrame({
        "time": iso(sel["startTime"]),
        "forecast": sel["forecast"],
        "actual": sel["actual"].round(0),
    })
    return {
        "decision_date": decision_date.isoformat(),
        "delivery_date": sel["delivery_date"].iloc[0].isoformat(),
        "cutoff_utc": sel["decision_cutoff"].iloc[0].strftime("%Y-%m-%dT%H:%M:%SZ"),
        "forecast_published_at": sel["publishTime"].iloc[0].strftime("%Y-%m-%dT%H:%M:%SZ"),
        "rows": records(out),
    }


@app.get("/api/metrics")
def metrics(cutoff: str = DEFAULT_CUTOFF):
    return {"cutoff": cutoff, **analysis.compute_metrics(evaluated(check_cutoff(cutoff)))}


@app.get("/api/metrics/by-hour")
def metrics_by_hour(cutoff: str = DEFAULT_CUTOFF):
    return records(analysis.metrics_by(evaluated(check_cutoff(cutoff)), "hour_uk"))


@app.get("/api/metrics/by-day")
def metrics_by_day(cutoff: str = DEFAULT_CUTOFF):
    df = evaluated(check_cutoff(cutoff)).copy()
    df["delivery_date"] = df["delivery_date"].astype(str)
    return records(analysis.metrics_by(df, "delivery_date"))


@app.get("/api/error-distribution")
def error_distribution(cutoff: str = DEFAULT_CUTOFF, bin_mw: int = 1000):
    """Histogram of (forecast - actual) so buyers can see the shape of the risk."""
    if not 100 <= bin_mw <= 5000:
        raise HTTPException(400, "bin_mw must be between 100 and 5000")
    err = evaluated(check_cutoff(cutoff))["error"]
    lo = int(np.floor(err.min() / bin_mw) * bin_mw)
    hi = int(np.ceil(err.max() / bin_mw) * bin_mw) + bin_mw
    counts, edges = np.histogram(err, bins=np.arange(lo, hi + 1, bin_mw))
    return [
        {"from_mw": int(edges[i]), "to_mw": int(edges[i + 1]), "count": int(counts[i])}
        for i in range(len(counts))
    ]


@app.get("/api/horizon")
def horizon():
    """Error vs how far ahead the forecast was published (all snapshots)."""
    return records(analysis.horizon_analysis(FCST, ACTUALS))


@app.get("/api/cutoff-sensitivity")
def cutoff_sensitivity():
    """How the error changes if the buyer decides earlier or later."""
    return records(analysis.cutoff_sensitivity(FCST, ACTUALS).round(1))