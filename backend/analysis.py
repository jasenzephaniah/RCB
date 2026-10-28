import argparse
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent / "data"
UK_TZ = "Europe/London"


# ---------------------------------------------------------------- loading
def load_actuals_hourly(path=None) -> pd.DataFrame:
    """Hourly actual wind generation (MW). Columns: startTime (UTC), actual."""
    path = Path(path) if path else DATA_DIR / "actuals_wind.csv"
    df = pd.read_csv(path, usecols=["startTime", "generation"])
    df["startTime"] = pd.to_datetime(df["startTime"], utc=True)
    g = (
        df.set_index("startTime")["generation"]
        .sort_index()
        .resample("1h")
        .agg(["mean", "count"])
    )
    g = g[g["count"] == 2]  # keep only hours with both half-hours present
    return g["mean"].rename("actual").reset_index()


def load_forecasts(path=None) -> pd.DataFrame:
    """All forecast snapshots. Columns: publishTime, startTime, forecast."""
    path = Path(path) if path else DATA_DIR / "windfor.csv"
    df = pd.read_csv(path, usecols=["publishTime", "startTime", "generation"])
    df["publishTime"] = pd.to_datetime(df["publishTime"], utc=True)
    df["startTime"] = pd.to_datetime(df["startTime"], utc=True)
    return df.rename(columns={"generation": "forecast"})


# -------------------------------------------------------------- selection
def select_forecasts(
    fcst: pd.DataFrame,
    decision_start: date = date(2026, 1, 1),
    decision_end: date = date(2026, 1, 31),
    cutoff: str = "09:00",
) -> pd.DataFrame:
    """For each decision date d, pick the latest snapshot published at or before
    cutoff (UK time) on d, and keep its forecasts for delivery day d+1."""
    hh, mm = (int(x) for x in cutoff.split(":"))
    snap_times = pd.DatetimeIndex(fcst["publishTime"].drop_duplicates().sort_values())
    by_snap = {t: g for t, g in fcst.groupby("publishTime")}

    parts = []
    d = decision_start
    while d <= decision_end:
        cutoff_utc = pd.Timestamp(f"{d.isoformat()} {hh:02d}:{mm:02d}", tz=UK_TZ).tz_convert("UTC")
        delivery = d + timedelta(days=1)
        day_start = pd.Timestamp(delivery.isoformat(), tz=UK_TZ).tz_convert("UTC")
        day_end = pd.Timestamp((delivery + timedelta(days=1)).isoformat(), tz=UK_TZ).tz_convert("UTC")

        pos = snap_times.searchsorted(cutoff_utc, side="right") - 1
        if pos >= 0:
            snap = snap_times[pos]
            rows = by_snap[snap]
            rows = rows[(rows["startTime"] >= day_start) & (rows["startTime"] < day_end)].copy()
            rows["decision_cutoff"] = cutoff_utc
            rows["delivery_date"] = delivery
            parts.append(rows)
        else:
            print(f"WARNING: no snapshot before cutoff for decision date {d}")
        d += timedelta(days=1)

    sel = pd.concat(parts, ignore_index=True)
    sel["horizon_h"] = (sel["startTime"] - sel["publishTime"]).dt.total_seconds() / 3600
    return sel


def evaluate(selected: pd.DataFrame, actuals: pd.DataFrame) -> pd.DataFrame:
    """Join selected forecasts to actuals and add error columns."""
    df = selected.merge(actuals, on="startTime", how="inner")
    df["error"] = df["forecast"] - df["actual"]
    df["abs_error"] = df["error"].abs()
    df["hour_uk"] = df["startTime"].dt.tz_convert(UK_TZ).dt.hour
    return df


# ---------------------------------------------------------------- metrics
def compute_metrics(df: pd.DataFrame) -> dict:
    e, ae = df["error"], df["abs_error"]
    mean_actual = df["actual"].mean()
    return {
        "n_hours": int(len(df)),
        "mean_actual_mw": float(mean_actual),
        "mean_forecast_mw": float(df["forecast"].mean()),
        "mae_mw": float(ae.mean()),
        "rmse_mw": float(np.sqrt((e ** 2).mean())),
        "bias_mw": float(e.mean()),
        "mae_pct_of_mean_actual": float(ae.mean() / mean_actual * 100),
        "abs_error_p50_mw": float(ae.quantile(0.50)),
        "abs_error_p90_mw": float(ae.quantile(0.90)),
        "abs_error_p99_mw": float(ae.quantile(0.99)),
        # 90% of hours, the forecast over-estimates actual wind by less than this
        "overforecast_p90_mw": float(max(e.quantile(0.90), 0)),
    }


def metrics_by(df: pd.DataFrame, key: str) -> pd.DataFrame:
    return (
        df.groupby(key)
        .agg(n=("error", "size"), mae=("abs_error", "mean"), bias=("error", "mean"),
             p90_abs=("abs_error", lambda s: s.quantile(0.9)))
        .round(0)
        .reset_index()
    )


# ------------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cutoff", default="09:00", help="UK-time cutoff on the day before delivery, HH:MM")
    args = ap.parse_args()

    actuals = load_actuals_hourly()
    fcst = load_forecasts()
    selected = select_forecasts(fcst, cutoff=args.cutoff)
    df = evaluate(selected, actuals)

    print(f"Cutoff {args.cutoff} UK | delivery days: {selected['delivery_date'].nunique()} "
          f"| selected rows: {len(selected)} | matched to actuals: {len(df)}")
    print(f"Horizon (h) min/median/max: {df['horizon_h'].min():.1f} / "
          f"{df['horizon_h'].median():.1f} / {df['horizon_h'].max():.1f}")
    print("\n=== Overall metrics ===")
    for k, v in compute_metrics(df).items():
        print(f"{k:28s} {v:,.1f}")
    print("\n=== By hour of day (UK) ===")
    print(metrics_by(df, "hour_uk").to_string(index=False))
    print("\n=== By horizon (hours, rounded) ===")
    df["horizon_bucket"] = (df["horizon_h"] // 6 * 6).astype(int)
    print(metrics_by(df, "horizon_bucket").to_string(index=False))


if __name__ == "__main__":
    main()