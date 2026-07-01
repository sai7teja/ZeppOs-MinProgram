#!/usr/bin/env python3
"""
Historical Backfill: Zepp Cloud to BigQuery
Fetches the last 1 year of PAI and Band Data (Steps/Sleep/HR) in chunks
and streams it to Google BigQuery.
"""

import os
import time
import json
import base64
import logging
import datetime as dt
from pathlib import Path

# Google Cloud Libraries
from google.cloud import secretmanager
from google.cloud import bigquery

import requests
from dotenv import load_dotenv
from huami_token.zepp import ZeppSession

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
LOG = logging.getLogger("zepp-bq-backfill")

# Configuration from Environment
load_dotenv()
ZEPP_EMAIL = os.getenv("ZEPP_EMAIL")
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")
GCP_SECRET_NAME = os.getenv("GCP_SECRET_NAME", "zepp-password")
BQ_DATASET = os.getenv("BQ_DATASET", "zepp_health_data")
BQ_TABLE_PAI = f"{BQ_DATASET}.pai_data"
BQ_TABLE_BAND = f"{BQ_DATASET}.band_data"
TOKEN_CACHE = Path(".zepp_token_cache.json")

# Backfill Settings
DAYS_TO_BACKFILL = 365
CHUNK_SIZE_DAYS = 7  # Fetch 7 days at a time to avoid overwhelming the API
SLEEP_BETWEEN_CHUNKS = 5  # Sleep 5 seconds between requests

def get_secret(project_id: str, secret_name: str) -> str:
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")

def refresh_token(email: str, password: str) -> tuple[str, str]:
    LOG.info(f"Authenticating with Zepp Cloud for user {email}...")
    session = ZeppSession(username=email, password=password)
    session.login()
    
    app_token = session.app_token
    user_id = str(session.user_id)
    
    if not app_token or not user_id:
        raise ValueError("Failed to extract token or user_id from login response.")
    
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    with TOKEN_CACHE.open("w") as f:
        json.dump({"app_token": app_token, "user_id": user_id, "updated_at": now}, f)
    
    return app_token, user_id

def get_cached_token() -> tuple[str, str] | None:
    if not TOKEN_CACHE.exists():
        return None
    with TOKEN_CACHE.open("r") as f:
        data = json.load(f)
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

def fetch_pai_chunk(app_token: str, user_id: str, start: dt.datetime, end: dt.datetime) -> list[dict]:
    headers = {"apptoken": app_token}
    params = {
        "eventType": "PaiHealthInfo",
        "limit": 100,
        "from": int(start.timestamp() * 1000),
        "to": int(end.timestamp() * 1000)
    }
    
    for region in ZEPP_PAI_REGIONS:
        url = f"https://{region}/users/{user_id}/events"
        try:
            resp = requests.get(url, headers=headers, params=params, timeout=5)
            if resp.status_code == 401:
                raise PermissionError("Token expired")
                
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

def fetch_band_data_chunk(app_token: str, user_id: str, start: dt.datetime, end: dt.datetime) -> list[dict]:
    url = "https://api-mifit.huami.com/v1/data/band_data.json"
    headers = {"apptoken": app_token}
    params = {
        "query_type": "detail",
        "device_type": "android_phone",
        "userid": user_id,
        "from_date": start.strftime("%Y-%m-%d"),
        "to_date": end.strftime("%Y-%m-%d"),
    }
    
    resp = requests.get(url, headers=headers, params=params)
    if resp.status_code == 401:
        raise PermissionError("Token expired")
    resp.raise_for_status()
    
    items = resp.json().get("data", [])
    records = []
    for item in items:
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
    
    # 1. Manage Token
    creds = get_cached_token()
    if not creds:
        LOG.info("No valid token cache found. Fetching password from Secret Manager...")
        password = get_secret(GCP_PROJECT_ID, GCP_SECRET_NAME)
        app_token, user_id = refresh_token(ZEPP_EMAIL, password)
    else:
        app_token, user_id = creds

    # 2. Iterate backwards in chunks
    end_date = dt.datetime.now()
    start_date = end_date - dt.timedelta(days=DAYS_TO_BACKFILL)
    
    current_end = end_date
    total_pai_inserted = 0
    total_band_inserted = 0
    
    LOG.info(f"Starting backfill from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
    
    while current_end > start_date:
        current_start = current_end - dt.timedelta(days=CHUNK_SIZE_DAYS)
        if current_start < start_date:
            current_start = start_date
            
        LOG.info(f"Fetching chunk: {current_start.strftime('%Y-%m-%d')} to {current_end.strftime('%Y-%m-%d')}")
        
        try:
            # Fetch and upload PAI
            pai_data = fetch_pai_chunk(app_token, user_id, current_start, current_end)
            if pai_data:
                stream_to_bq(bq_client, BQ_TABLE_PAI, pai_data)
                total_pai_inserted += len(pai_data)
            
            # Sleep to avoid rate limiting
            time.sleep(SLEEP_BETWEEN_CHUNKS)
            
            # Fetch and upload Band Data
            band_data = fetch_band_data_chunk(app_token, user_id, current_start, current_end)
            if band_data:
                stream_to_bq(bq_client, BQ_TABLE_BAND, band_data)
                total_band_inserted += len(band_data)
            
        except PermissionError:
            LOG.warning("Token expired! Please run the continuous sync script to generate a new token cache.")
            break
        except Exception as e:
            LOG.error(f"Error fetching chunk: {e}")
            break
            
        current_end = current_start
        
        # Sleep before the next chunk
        time.sleep(SLEEP_BETWEEN_CHUNKS)
        
    LOG.info(f"Backfill Complete! Inserted {total_pai_inserted} PAI records and {total_band_inserted} Band Data records.")

if __name__ == "__main__":
    main()
