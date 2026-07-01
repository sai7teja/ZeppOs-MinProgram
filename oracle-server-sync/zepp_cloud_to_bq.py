#!/usr/bin/env python3
"""
Continuous Zepp Cloud to BigQuery Sync (GTR 2 Data Pipeline)
Fetches PAI and Band Data (Steps/Sleep/HR) and streams it to Google BigQuery.
Reads Zepp password securely from Google Cloud Secret Manager.
Designed to run continuously as a background service on your Oracle VM.
"""

import os
import time
import json
import base64
import logging
import datetime as dt
from pathlib import Path

# Google Cloud Libraries
try:
    from google.cloud import secretmanager
    from google.cloud import bigquery
except ImportError:
    print("Please install GCP libraries: pip install google-cloud-secret-manager google-cloud-bigquery")
    import sys
    sys.exit(1)

import requests
from dotenv import load_dotenv
from huami_token.zepp import ZeppSession

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
LOG = logging.getLogger("zepp-to-bq")

# Configuration from Environment
load_dotenv()
ZEPP_EMAIL = os.getenv("ZEPP_EMAIL")
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")
GCP_SECRET_NAME = os.getenv("GCP_SECRET_NAME", "zepp-password")
BQ_DATASET = os.getenv("BQ_DATASET", "zepp_health")
BQ_TABLE_PAI = f"{BQ_DATASET}.pai_data"
BQ_TABLE_BAND = f"{BQ_DATASET}.band_data"
TOKEN_CACHE = Path(".zepp_token_cache.json")
SYNC_INTERVAL = 3600  # 1 hour (avoids rate limits)

def get_secret(project_id: str, secret_name: str) -> str:
    """Fetch the Zepp password from GCP Secret Manager."""
    LOG.info(f"Fetching password from GCP Secret Manager: {secret_name}")
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")

def refresh_token(email: str, password: str) -> tuple[str, str]:
    """Logs in using huami-token and returns (app_token, user_id)."""
    LOG.info(f"Authenticating with Zepp Cloud for user {email}...")
    session = ZeppSession(username=email, password=password)
    session.login()
    
    app_token = session.app_token
    user_id = str(session.user_id)
    
    if not app_token or not user_id:
        raise ValueError("Failed to extract token or user_id from login response.")
    
    # Save to cache
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    with TOKEN_CACHE.open("w") as f:
        json.dump({"app_token": app_token, "user_id": user_id, "updated_at": now}, f)
    
    return app_token, user_id

def get_cached_token() -> tuple[str, str] | None:
    if not TOKEN_CACHE.exists():
        return None
    with TOKEN_CACHE.open("r") as f:
        data = json.load(f)
        
    # Assume expired if older than 30 days
    updated = dt.datetime.fromisoformat(data["updated_at"])
    if (dt.datetime.now(dt.timezone.utc) - updated).days > 25:
        return None
        
    return data.get("app_token"), data.get("user_id")

ZEPP_PAI_REGIONS = [
    "api-mifit-de2.zepp.com",   # Europe
    "api-mifit-us2.zepp.com",   # USA
    "api-mifit-sg2.zepp.com",   # Singapore / Asia
    "api-mifit-ru.zepp.com",    # Russia
    "api-mifit-us2.huami.com",  # Legacy US
    "api-mifit-de2.huami.com",  # Legacy EU
    "api-mifit.huami.com"       # Global Fallback
]

def fetch_pai(app_token: str, user_id: str) -> list[dict]:
    headers = {"apptoken": app_token}
    now = dt.datetime.now()
    start = now - dt.timedelta(days=2)
    params = {
        "eventType": "PaiHealthInfo",
        "limit": 100,
        "from": int(start.timestamp() * 1000),
        "to": int(now.timestamp() * 1000)
    }
    
    for region in ZEPP_PAI_REGIONS:
        url = f"https://{region}/users/{user_id}/events"
        try:
            resp = requests.get(url, headers=headers, params=params, timeout=5)
            if resp.status_code == 401:
                raise PermissionError("Token expired")
            
            # If successful and data exists, we found the right region
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                if data:
                    records = []
                    for item in data:
                        records.append({
                            "timestamp": dt.datetime.fromtimestamp(item["timestamp"]/1000, dt.timezone.utc).isoformat(),
                            "date": item.get("time", ""),
                            "total_pai": float(item.get("totalPai", 0)),
                            "daily_pai": float(item.get("dailyPai", 0)),
                            "max_hr": 0,
                            "rest_hr": 0
                        })
                    return records
        except Exception:
            pass
            
    return []

def fetch_band_data(app_token: str, user_id: str) -> list[dict]:
    url = "https://api-mifit.huami.com/v1/data/band_data.json"
    headers = {"apptoken": app_token}
    
    now = dt.datetime.now()
    start = now - dt.timedelta(days=2)
    params = {
        "query_type": "detail",
        "device_type": "android_phone",
        "userid": user_id,
        "from_date": start.strftime("%Y-%m-%d"),
        "to_date": now.strftime("%Y-%m-%d"),
    }
    
    resp = requests.get(url, headers=headers, params=params)
    if resp.status_code == 401:
        raise PermissionError("Token expired")
    resp.raise_for_status()
    
    items = resp.json().get("data", [])
    records = []
    for item in items:
        # Decode the summary base64 blob to get Steps and Sleep
        summary_b64 = item.get("summary", "")
        steps = 0
        sleep_deep = 0
        sleep_light = 0
        try:
            summary_json = json.loads(base64.b64decode(summary_b64).decode('utf-8'))
            steps = summary_json.get("stp", {}).get("v", 0)
            sleep = summary_json.get("slp", {})
            sleep_deep = sleep.get("dp", 0)
            sleep_light = sleep.get("lt", 0)
        except Exception:
            pass
            
        date_str = item.get("date_time", "")
        timestamp_iso = ""
        if date_str:
            try:
                # Convert "YYYY-MM-DD" to ISO UTC
                parsed_date = dt.datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=dt.timezone.utc)
                timestamp_iso = parsed_date.isoformat()
            except ValueError:
                pass
                
        records.append({
            "timestamp": timestamp_iso,
            "date": date_str,
            "steps": int(steps),
            "deep_sleep_minutes": int(sleep_deep),
            "light_sleep_minutes": int(sleep_light)
        })
    return records

def stream_to_bq(client, table_id: str, rows: list[dict]):
    if not rows:
        return
    errors = client.insert_rows_json(table_id, rows)
    if errors:
        LOG.error(f"Encountered errors inserting to {table_id}: {errors}")
    else:
        LOG.info(f"Successfully inserted {len(rows)} rows into {table_id}")

def main():
    if not GCP_PROJECT_ID:
        LOG.error("GCP_PROJECT_ID environment variable is missing!")
        return

    bq_client = bigquery.Client(project=GCP_PROJECT_ID)
    
    while True:
        try:
            LOG.info("Starting sync cycle...")
            
            # 1. Manage Token
            creds = get_cached_token()
            if not creds:
                LOG.info("No valid token cache found. Fetching password from Secret Manager...")
                password = get_secret(GCP_PROJECT_ID, GCP_SECRET_NAME)
                app_token, user_id = refresh_token(ZEPP_EMAIL, password)
            else:
                app_token, user_id = creds
                
            # 2. Fetch Data
            try:
                pai_data = fetch_pai(app_token, user_id)
                LOG.info(f"Fetched {len(pai_data)} PAI records.")
                stream_to_bq(bq_client, BQ_TABLE_PAI, pai_data)
                
                band_data = fetch_band_data(app_token, user_id)
                LOG.info(f"Fetched {len(band_data)} Band Data records.")
                stream_to_bq(bq_client, BQ_TABLE_BAND, band_data)
                
            except PermissionError:
                # Token expired during request, delete cache to force refresh on next loop
                LOG.warning("Token expired during API request. Invalidating cache.")
                if TOKEN_CACHE.exists():
                    TOKEN_CACHE.unlink()
                time.sleep(10)
                continue
                
        except Exception as e:
            LOG.error(f"Error during sync cycle: {e}")
            
        # 3. Sleep safely (1 hour) to strictly avoid Zepp rate limits
        LOG.info(f"Cycle complete. Sleeping for {SYNC_INTERVAL} seconds...")
        time.sleep(SYNC_INTERVAL)

if __name__ == "__main__":
    main()
