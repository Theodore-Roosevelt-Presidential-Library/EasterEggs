"""Writes docs/live.json: whether the aurora or snow delights should play today.

Standard library only. Run by .github/workflows/live.yml every three hours.

aurora: NOAA's 3-day Kp forecast reaches 5 or more during tonight's dark hours over Medora
        (roughly 02:00-12:00 UTC). Kp 5 is "Possible" in the Northern Lights Watch scale.
snow:   Open-Meteo forecasts at least 0.5 cm of snow in Medora today (America/Denver).
"""
import json
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

MEDORA = (46.9139, -103.5244)
KP_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json"
SNOW_URL = (
    "https://api.open-meteo.com/v1/forecast?latitude={}&longitude={}"
    "&daily=snowfall_sum&timezone=America%2FDenver&forecast_days=1"
).format(*MEDORA)
AURORA_KP = 5
SNOW_CM = 0.5
OUT = Path(__file__).resolve().parent.parent / "docs" / "live.json"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "TRPL-Delight/1.0 (hello@trlibrary.com)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def kp_rows(data):
    """NOAA has served this as a list of lists with a header row, and as a list of objects."""
    if data and isinstance(data[0], list):
        head = data[0]
        return [dict(zip(head, row)) for row in data[1:]]
    return data


def tonight_kp(now):
    """Highest forecast Kp in the next dark stretch over Medora."""
    start = now.replace(hour=2, minute=0, second=0, microsecond=0)
    if now.hour >= 12:
        start += timedelta(days=1)
    end = start + timedelta(hours=10)
    # If it is dark right now, the current stretch counts.
    if now.hour < 12 and now.hour >= 2:
        start = now.replace(minute=0, second=0, microsecond=0)
        end = now.replace(hour=12, minute=0, second=0, microsecond=0)
    best = None
    for row in kp_rows(get(KP_URL)):
        try:
            t = datetime.fromisoformat(str(row["time_tag"]).replace("Z", "")).replace(tzinfo=timezone.utc)
            kp = float(row["kp"])
        except (KeyError, ValueError, TypeError):
            continue
        # A 3-hour interval counts if it overlaps the dark stretch.
        if t + timedelta(hours=3) > start and t < end:
            best = kp if best is None else max(best, kp)
    return best


def snowfall_today():
    data = get(SNOW_URL)
    vals = (data.get("daily") or {}).get("snowfall_sum") or [0]
    return float(vals[0] or 0)


def main():
    now = datetime.now(timezone.utc)
    previous = json.loads(OUT.read_text()) if OUT.exists() else {}
    out = {"updated": now.strftime("%Y-%m-%dT%H:%M:%SZ")}
    try:
        kp = tonight_kp(now)
        out["kp_tonight"] = kp
        out["aurora"] = kp is not None and kp >= AURORA_KP
    except Exception as e:  # keep the last good value rather than failing the run
        print("Kp forecast failed:", e, file=sys.stderr)
        out["aurora"] = bool(previous.get("aurora"))
    try:
        cm = snowfall_today()
        out["snowfall_cm"] = round(cm, 1)
        out["snow"] = cm >= SNOW_CM
    except Exception as e:
        print("Snow forecast failed:", e, file=sys.stderr)
        out["snow"] = bool(previous.get("snow"))

    # Only rewrite the file when a flag changes or the last update is getting old,
    # so the repository isn't flooded with commits.
    same = previous.get("aurora") == out["aurora"] and previous.get("snow") == out["snow"]
    try:
        age = now - datetime.fromisoformat(previous["updated"].replace("Z", "+00:00"))
    except Exception:
        age = timedelta(days=1)
    if same and age < timedelta(hours=9):
        print("No change:", json.dumps(out))
        return
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print("Wrote", OUT.name, json.dumps(out))


if __name__ == "__main__":
    main()
