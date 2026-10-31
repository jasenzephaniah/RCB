# Wind forecast accuracy portal

A pilot web app for a UK day-ahead power buying team. It shows the wind forecast that was
available at the moment a day-ahead decision had to be made, and measures how accurate those
forecasts were in January 2026, so buyers can plan for the error.

- **Live app:** https://rcb-fz4j.vercel.app
- **API (interactive docs at `/docs`):** https://rcb-smoky.vercel.app
- **Demo video:** https://youtu.be/oN06JpLhvsg

## AI tools used

This project was built with the help of an AI assistant (Claude, by Anthropic). It was used to
explore the Elexon APIs, draft the analysis code, the FastAPI backend, the React frontend, the
Docker configuration and this README. The author ran every step and checked the results against
the Elexon data.

## The problem

A utility buys power in the day-ahead market, one day before delivery. It needs to know how much
power must come from other sources (for example thermal plants) beyond the wind generation it can
expect. Wind depends on the weather, so the decision rests on a forecast. The app answers two
questions:

1. What was the latest wind forecast available when the decision had to be made?
2. How wrong were such forecasts, in numbers, so that the error can be built into the decision?

Scope: national-level wind only, using two Elexon BMRS datasets and nothing else.

| Dataset | Used for | Fields used |
|---|---|---|
| `FUELHH` (fuelType = WIND) | Actual generation, half-hourly | `startTime`, `generation` |
| `WINDFOR` | Forecasts, hourly, published every 2 to 4 hours | `startTime`, `publishTime`, `generation` |

## Key findings (decision at 09:00 UK time, delivery days 2 Jan to 1 Feb 2026, 744 hours)

| Measure | Value |
|---|---|
| Average actual wind | 11,284 MW |
| Average forecast | 13,031 MW |
| Average over-forecast (bias) | +1,748 MW (about 15% of average wind) |
| Typical error (MAE) | 2,039 MW (18% of average wind) |
| RMSE | 2,505 MW |
| 1-in-10 miss (P90 absolute error) | 4,098 MW |
| 1-in-100 miss (P99 absolute error) | 6,261 MW |

- Forecasts ran high in every forecast-age group, so a large part of the error is systematic.
- Error grows with forecast age: MAE is about 1,690 MW for forecasts published 0 to 6 hours before
  the target hour and about 2,330 MW at 42 to 48 hours (roughly 38% higher).
- Deciding later in the morning helps a little: MAE falls from 2,039 MW (09:00) to 1,901 MW (12:00).
  With one month of data this difference may be noise.
- The "shortfall buffer" shown in the app is the P90 over-forecast: in 9 of 10 January hours, actual
  wind came in less than this far below the forecast.

## Method and assumptions

1. **Decision time.** A buyer deciding for delivery day D decides on day D-1 at a cutoff, default
   **09:00 UK time**. This is an assumption (the brief does not give one) and it can be changed in
   the app between 04:00 and 12:00.
2. **Forecast used.** The latest `WINDFOR` publication with `publishTime` at or before the cutoff.
   Later publications are never used, so there is no look-ahead.
3. **Decisions in January.** Decision dates are 1 to 31 Jan 2026, so delivery days are 2 Jan to
   1 Feb 2026.
4. **Resolution.** Forecasts are hourly and actuals are half-hourly. Each pair of half-hours is
   averaged into one hourly actual, and an hour is dropped if either half-hour is missing.
5. **Error.** `error = forecast - actual`. Positive means the forecast was too high.
6. **Time zones.** All source timestamps are UTC. Cutoffs and "hour of day" use `Europe/London`
   (the same as UTC in January, but handled properly).
7. **Shortfall buffer.** The P90 of the positive over-forecast across the month, a single MW figure
   measured on the same data it is applied to (in-sample).

## Repository layout

```
.
├── README.md
├── docker-compose.yml        Runs backend + frontend together
├── backend/                  Python 3 / FastAPI
│   ├── fetch_data.py         Downloads actuals and forecasts from Elexon into data/ (run once)
│   ├── analysis.py           Forecast selection, error metrics, horizon and cutoff analyses
│   ├── main.py               FastAPI app: JSON endpoints over the analysis functions
│   ├── data/
│   │   ├── actuals_wind.csv  FUELHH wind, half-hourly
│   │   └── windfor.csv       WINDFOR, every publication
│   ├── requirements.txt
│   └── Dockerfile
└── frontend/                 React 18 + Vite + Recharts
    ├── src/
    │   ├── App.jsx           Page layout, state, data loading
    │   ├── api.js            fetch helper and useApi hook (VITE_API_URL aware)
    │   ├── format.js         Number and UK-time formatting
    │   ├── theme.css         Design tokens, light and dark mode
    │   └── components/       One file per chart or panel
    ├── nginx.conf            Serves the build and proxies /api to the backend (Docker)
    ├── vite.config.js        Dev proxy for /api
    ├── package.json
    └── Dockerfile
```

## Run it locally

### Option 1: Docker

```bash
docker compose up --build
```

Open http://localhost:3000 (dashboard) and http://localhost:8000/docs (API docs).

### Option 2: without Docker

Backend (Python 3.10 or newer):

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1          # Windows PowerShell; on macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload           # http://127.0.0.1:8000/docs
```

Frontend (Node 18 or newer), in a second terminal:

```bash
cd frontend
npm install
npm run dev                         # http://localhost:5173 (proxies /api to port 8000)
```

### Refreshing the data (optional)

The CSVs are committed, so the app needs no internet access to run. To re-download them:

```bash
cd backend
python fetch_data.py
```

The script fetches in small chunks, retries on HTTP 429 and 5xx, removes duplicates and prints
sanity checks (48 half-hours per day, number of forecast publications, largest gap between them).

## API

| Endpoint | Purpose |
|---|---|
| `GET /api/meta` | Assumptions and data coverage |
| `GET /api/metrics?cutoff=09:00` | MAE, RMSE, bias, P50/P90/P99 |
| `GET /api/latest-forecast?decision_date=2026-01-15&cutoff=09:00` | The forecast available on a decision day, with actuals |
| `GET /api/forecast-vs-actual?cutoff=&from=&to=` | Hourly forecast vs actual for a range of delivery days |
| `GET /api/metrics/by-hour`, `/api/metrics/by-day` | Error by hour of day, by delivery day |
| `GET /api/error-distribution?bin_mw=1000` | Histogram of forecast minus actual |
| `GET /api/horizon` | Error by forecast age, using every publication |
| `GET /api/cutoff-sensitivity` | Error if the decision is made between 04:00 and 12:00 |

Invalid input (for example `cutoff=9am`) returns HTTP 400 with a message.

## Deployment

Two Vercel projects from this one repository:

- **Backend:** Root Directory `backend`. Vercel detects the FastAPI `app` in `main.py` and installs
  `requirements.txt`. The CSV files in `data/` are bundled with it.
- **Frontend:** Root Directory `frontend`, framework Vite, environment variable `VITE_API_URL` set
  to the backend URL (no trailing slash).

## Design decisions

- **Pre-fetched CSVs instead of live Elexon calls.** The deployed app is fast, deterministic and
  does not depend on Elexon being up. The trade-off is that new data needs a re-fetch.
- **Analysis separated from the API.** `analysis.py` has no web code, so the numbers can be checked
  and reused without running a server. `main.py` only validates input and shapes JSON.
- **Rules come from the API.** The assumptions shown in the UI are served by `/api/meta`, so the
  interface and the analysis cannot disagree.
- **Same-origin API in Docker and dev.** nginx and the Vite dev server proxy `/api`, so the
  frontend needs no configuration except on Vercel.

## Limitations and next steps

- One month of data is a small sample. Differences between decision times in particular may be noise.
- The buffer is in-sample. A fairer test would estimate it on earlier months and apply it to later ones.
- The forecasts are biased high. A simple bias correction would remove part of the error, but the
  reason was not investigated (for example, whether the two datasets cover the same wind capacity).
- There is no automated test suite yet. Results were checked by running the analysis directly,
  comparing the API output with it, and testing the UI in a browser.
- The decision time is an assumption. A real deadline should replace it.

## Data source

Contains BMRS data © Elexon Limited copyright and database right 2026. Data is used under the
BMRS Data Licence Terms.
