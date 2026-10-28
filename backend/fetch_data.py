import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import requests

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"
DATA_DIR = Path(__file__).resolve().parent / "data"

# Wide fetch windows (see module docstring)
ACTUALS_FROM = date(2026, 1, 1)
ACTUALS_TO = date(2026, 2, 2)
FORECAST_PUBLISH_FROM = datetime(2025, 12, 31, 0, 0, tzinfo=timezone.utc)
FORECAST_PUBLISH_TO = datetime(2026, 2, 1, 0, 0, tzinfo=timezone.utc)

ACTUALS_CHUNK_DAYS = 7      # settlement-date chunk size
FORECAST_CHUNK_HOURS = 24   # publish-time chunk size
PAUSE_SECONDS = 0.5         # polite delay between calls
MAX_RETRIES = 5


def get_json(path: str, params: dict) -> list:
    """GET with retry/backoff on 429 and 5xx. Returns the parsed JSON list."""
    url = f"{BASE_URL}{path}"
    for attempt in range(1, MAX_RETRIES + 1):
        resp = requests.get(url, params=params, headers={"accept": "application/json"}, timeout=60)
        if resp.status_code == 200:
            return resp.json()
        if resp.status_code == 429 or resp.status_code >= 500:
            wait = 2 ** attempt
            print(f"  HTTP {resp.status_code} - retry {attempt}/{MAX_RETRIES} in {wait}s")
            time.sleep(wait)
            continue
        # 400 etc: our request is wrong, no point retrying
        raise RuntimeError(f"HTTP {resp.status_code} for {resp.url}\n{resp.text[:500]}")
    raise RuntimeError(f"Gave up after {MAX_RETRIES} retries: {url} {params}")


def fmt_dt(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def fetch_actuals() -> pd.DataFrame:
    """FUELHH wind actuals. Uses settlement-date filters ONLY (the API rejects
    a mix of settlement-date and publish-date filters)."""
    rows = []
    start = ACTUALS_FROM
    while start <= ACTUALS_TO:
        end = min(start + timedelta(days=ACTUALS_CHUNK_DAYS - 1), ACTUALS_TO)
        print(f"Actuals {start} -> {end}")
        data = get_json(
            "/datasets/FUELHH/stream",
            {
                "settlementDateFrom": start.isoformat(),
                "settlementDateTo": end.isoformat(),
                "fuelType": "WIND",
            },
        )
        print(f"  {len(data)} rows")
        rows.extend(data)
        start = end + timedelta(days=1)
        time.sleep(PAUSE_SECONDS)
    return pd.DataFrame(rows)


def fetch_forecasts() -> pd.DataFrame:
    """WINDFOR forecasts, filtered by publish time in daily chunks."""
    rows = []
    start = FORECAST_PUBLISH_FROM
    step = timedelta(hours=FORECAST_CHUNK_HOURS)
    while start < FORECAST_PUBLISH_TO:
        end = min(start + step, FORECAST_PUBLISH_TO)
        print(f"Forecasts published {fmt_dt(start)} -> {fmt_dt(end)}")
        data = get_json(
            "/datasets/WINDFOR/stream",
            {
                "publishDateTimeFrom": fmt_dt(start),
                "publishDateTimeTo": fmt_dt(end),
            },
        )
        print(f"  {len(data)} rows")
        rows.extend(data)
        start = end
        time.sleep(PAUSE_SECONDS)
    return pd.DataFrame(rows)


def clean_and_save(df: pd.DataFrame, name: str, key_cols: list, sort_cols: list) -> pd.DataFrame:
    before = len(df)
    df = df.drop_duplicates(subset=key_cols).sort_values(sort_cols).reset_index(drop=True)
    print(f"{name}: {before} raw rows -> {len(df)} after de-duplication")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    out = DATA_DIR / name
    df.to_csv(out, index=False)
    print(f"Saved {out}")
    return df


def sanity_checks(actuals: pd.DataFrame, fcst: pd.DataFrame) -> None:
    print("\n=== Sanity checks ===")

    # Actuals: only wind, 48 half-hours per day, no gaps, no nulls
    print("Actual fuel types:", actuals["fuelType"].unique().tolist())
    per_day = actuals.groupby("settlementDate").size()
    bad_days = per_day[per_day != 48]
    print(f"Actuals: {len(actuals)} rows over {per_day.size} days "
          f"({'OK, 48/day' if bad_days.empty else 'days not equal to 48 rows: ' + str(bad_days.to_dict())})")
    print("Actuals null generation:", int(actuals["generation"].isna().sum()))

    # Forecasts: snapshots, horizon
    fcst = fcst.copy()
    fcst["publishTime"] = pd.to_datetime(fcst["publishTime"], utc=True)
    fcst["startTime"] = pd.to_datetime(fcst["startTime"], utc=True)
    n_snap = fcst["publishTime"].nunique()
    print(f"Forecasts: {len(fcst)} rows, {n_snap} distinct publishTime snapshots")
    print("Forecast publish range:", fcst["publishTime"].min(), "->", fcst["publishTime"].max())
    print("Forecast target range :", fcst["startTime"].min(), "->", fcst["startTime"].max())
    print("Forecast null generation:", int(fcst["generation"].isna().sum()))
    gaps = fcst["publishTime"].drop_duplicates().sort_values().diff().dropna()
    print("Largest gap between snapshots:", gaps.max())

    # Past-target rows: forecasts whose startTime is before publishTime
    stale = (fcst["startTime"] < fcst["publishTime"]).sum()
    print(f"Forecast rows with target before publish time (carried-forward values): {stale}")


def main() -> None:
    actuals = clean_and_save(
        fetch_actuals(), "actuals_wind.csv",
        key_cols=["startTime"], sort_cols=["startTime"],
    )
    fcst = clean_and_save(
        fetch_forecasts(), "windfor.csv",
        key_cols=["publishTime", "startTime"], sort_cols=["publishTime", "startTime"],
    )
    sanity_checks(actuals, fcst)


if __name__ == "__main__":
    main()